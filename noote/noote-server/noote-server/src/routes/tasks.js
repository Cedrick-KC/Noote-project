const express = require("express");
const fs = require("fs");
const Task = require("../models/Task");
const TaskComment = require("../models/TaskComment");
const Attachment = require("../models/Attachment");
const User = require("../models/User");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendPushToUser } = require("../utils/push");
const { logAudit } = require("../utils/audit");
const { advanceDate } = require("../utils/recurrence");
const { isNonEmptyString, isOneOf, isValidDateString, clean } = require("../utils/validate");
const { upload } = require("../middleware/upload");

const router = express.Router();
router.use(requireAuth);

const POPULATE = [{ path: "assignedTo", select: "name email" }, { path: "assignedBy", select: "name email" }];
const PRIORITIES = ["low", "normal", "high"];
const RECURRENCE_OPTIONS = ["none", "daily", "weekly", "monthly"];

async function withCounts(tasks) {
  const ids = tasks.map((t) => t._id);
  const [commentCounts, attachmentCounts] = await Promise.all([
    TaskComment.aggregate([{ $match: { task: { $in: ids } } }, { $group: { _id: "$task", count: { $sum: 1 } } }]),
    Attachment.aggregate([{ $match: { task: { $in: ids } } }, { $group: { _id: "$task", count: { $sum: 1 } } }]),
  ]);
  const commentMap = Object.fromEntries(commentCounts.map((c) => [String(c._id), c.count]));
  const attachmentMap = Object.fromEntries(attachmentCounts.map((c) => [String(c._id), c.count]));
  return tasks.map((t) => {
    const obj = t.toObject ? t.toObject() : t;
    obj.commentCount = commentMap[String(t._id)] || 0;
    obj.attachmentCount = attachmentMap[String(t._id)] || 0;
    return obj;
  });
}

// GET /api/tasks
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = { organization: req.user.organization };
    if (req.user.role === "worker") {
      query.assignedTo = req.user.id;
    } else if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
    }
    const tasks = await Task.find(query).sort({ createdAt: -1 }).populate(POPULATE);
    res.json(await withCounts(tasks));
  })
);

// POST /api/tasks — create a single task (personal, or admin-assigned to one worker)
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { text, description, priority, dueDate, assignedTo, recurrence } = req.body || {};
    if (!isNonEmptyString(text, { max: 500 })) return res.status(400).json({ error: "text is required (max 500 characters)" });
    if (priority && !isOneOf(priority, PRIORITIES)) return res.status(400).json({ error: "Invalid priority" });
    if (!isValidDateString(dueDate)) return res.status(400).json({ error: "dueDate must be YYYY-MM-DD" });
    if (recurrence && !isOneOf(recurrence, RECURRENCE_OPTIONS)) return res.status(400).json({ error: "Invalid recurrence" });

    let targetUserId = req.user.id;
    if (req.user.role === "admin" && assignedTo) {
      const target = await User.findOne({ _id: assignedTo, organization: req.user.organization, active: true });
      if (!target) return res.status(404).json({ error: "That worker was not found in your organization" });
      targetUserId = String(target._id);
    } else if (req.user.role === "worker" && assignedTo && assignedTo !== req.user.id) {
      return res.status(403).json({ error: "Only an admin can assign tasks to other workers" });
    }

    const task = await Task.create({
      organization: req.user.organization,
      text: clean(text, 500),
      description: clean(description || "", 5000),
      priority: priority || "normal",
      dueDate: dueDate || null,
      recurrence: recurrence || "none",
      assignedTo: targetUserId,
      assignedBy: req.user.id,
    });

    const populated = await task.populate(POPULATE);
    res.status(201).json({ ...populated.toObject(), commentCount: 0, attachmentCount: 0 });

    if (targetUserId !== req.user.id) {
      logAudit(req, "task.assigned", "Task", task._id, { text: task.text, workerId: targetUserId });
      sendPushToUser(targetUserId, { title: "New task assigned", body: task.text, url: "/" })
        .catch((err) => console.error("Push notify failed:", err.message));
    }
  })
);

// POST /api/tasks/bulk-assign — admin assigns the same task to several workers at once
router.post(
  "/bulk-assign",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { text, description, priority, dueDate, recurrence, workerIds } = req.body || {};
    if (!isNonEmptyString(text, { max: 500 })) return res.status(400).json({ error: "text is required" });
    if (!Array.isArray(workerIds) || workerIds.length === 0) return res.status(400).json({ error: "workerIds must be a non-empty array" });
    if (workerIds.length > 200) return res.status(400).json({ error: "Too many workers in one request (max 200)" });
    if (priority && !isOneOf(priority, PRIORITIES)) return res.status(400).json({ error: "Invalid priority" });
    if (!isValidDateString(dueDate)) return res.status(400).json({ error: "dueDate must be YYYY-MM-DD" });

    const workers = await User.find({ _id: { $in: workerIds }, organization: req.user.organization, active: true });
    if (workers.length === 0) return res.status(404).json({ error: "None of those workers were found in your organization" });

    const docs = await Task.insertMany(workers.map((w) => ({
      organization: req.user.organization,
      text: clean(text, 500),
      description: clean(description || "", 5000),
      priority: priority || "normal",
      dueDate: dueDate || null,
      recurrence: recurrence && isOneOf(recurrence, RECURRENCE_OPTIONS) ? recurrence : "none",
      assignedTo: w._id,
      assignedBy: req.user.id,
    })));

    const populated = await Task.find({ _id: { $in: docs.map((d) => d._id) } }).populate(POPULATE);
    res.status(201).json(await withCounts(populated));

    logAudit(req, "task.bulk_assigned", "Task", null, { text: clean(text, 500), workerCount: workers.length });
    workers.forEach((w) => {
      sendPushToUser(w._id, { title: "New task assigned", body: clean(text, 500), url: "/" })
        .catch((err) => console.error("Push notify failed:", err.message));
    });
  })
);

// PATCH /api/tasks/:id
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const isOwner = String(task.assignedTo) === req.user.id;
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ error: "You can only update tasks assigned to you" });
    }

    const { text, description, priority, dueDate, done, assignedTo, recurrence } = req.body || {};
    if (text !== undefined) {
      if (!isNonEmptyString(text, { max: 500 })) return res.status(400).json({ error: "text must be 1-500 characters" });
      task.text = clean(text, 500);
    }
    if (description !== undefined) task.description = clean(description, 5000);
    if (priority !== undefined) {
      if (!isOneOf(priority, PRIORITIES)) return res.status(400).json({ error: "Invalid priority" });
      task.priority = priority;
    }
    if (dueDate !== undefined) {
      if (!isValidDateString(dueDate)) return res.status(400).json({ error: "dueDate must be YYYY-MM-DD" });
      task.dueDate = dueDate;
    }
    if (recurrence !== undefined && req.user.role === "admin") {
      if (!isOneOf(recurrence, RECURRENCE_OPTIONS)) return res.status(400).json({ error: "Invalid recurrence" });
      task.recurrence = recurrence;
    }

    const wasDone = task.done;
    if (typeof done === "boolean") task.done = done;

    if (assignedTo && req.user.role === "admin") {
      const target = await User.findOne({ _id: assignedTo, organization: req.user.organization, active: true });
      if (!target) return res.status(404).json({ error: "That worker was not found in your organization" });
      if (String(target._id) !== String(task.assignedTo)) {
        logAudit(req, "task.reassigned", "Task", task._id, { text: task.text, toWorkerId: String(target._id) });
      }
      task.assignedTo = target._id;
    }

    await task.save();

    // Just completed a recurring task → spin up the next occurrence automatically
    let nextTask = null;
    if (!wasDone && task.done && task.recurrence !== "none") {
      nextTask = await Task.create({
        organization: task.organization,
        text: task.text,
        description: task.description,
        priority: task.priority,
        dueDate: advanceDate(task.dueDate, task.recurrence),
        recurrence: task.recurrence,
        assignedTo: task.assignedTo,
        assignedBy: task.assignedBy,
      });
    }

    const populated = await task.populate(POPULATE);
    const counts = (await withCounts([populated]))[0];
    if (nextTask) counts.nextOccurrence = (await nextTask.populate(POPULATE)).toObject();
    res.json(counts);
  })
);

// DELETE /api/tasks/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const isSelfCreatedPersonalTask = String(task.assignedBy) === req.user.id && String(task.assignedTo) === req.user.id;
    if (req.user.role !== "admin" && !isSelfCreatedPersonalTask) {
      return res.status(403).json({ error: "Only an admin can remove a task assigned by someone else" });
    }

    await TaskComment.deleteMany({ task: task._id });
    const attachments = await Attachment.find({ task: task._id });
    await Promise.all(attachments.map((a) => fs.promises.unlink(a.path || "").catch(() => {})));
    await Attachment.deleteMany({ task: task._id });
    await task.deleteOne();

    logAudit(req, "task.deleted", "Task", task._id, { text: task.text });
    res.json({ ok: true });
  })
);

/* ---------- comments ---------- */

// GET /api/tasks/:id/comments
router.get(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (req.user.role !== "admin" && String(task.assignedTo) !== req.user.id) {
      return res.status(403).json({ error: "You can only view comments on your own tasks" });
    }
    const comments = await TaskComment.find({ task: task._id }).sort({ createdAt: 1 }).populate("author", "name");
    res.json(comments);
  })
);

// POST /api/tasks/:id/comments
router.post(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (req.user.role !== "admin" && String(task.assignedTo) !== req.user.id) {
      return res.status(403).json({ error: "You can only comment on your own tasks" });
    }
    const { text } = req.body || {};
    if (!isNonEmptyString(text, { max: 2000 })) return res.status(400).json({ error: "text is required (max 2000 characters)" });

    const comment = await TaskComment.create({
      task: task._id, organization: req.user.organization, author: req.user.id, text: clean(text, 2000),
    });
    const populated = await comment.populate("author", "name");
    res.status(201).json(populated);

    const notifyUserId = String(task.assignedTo) === req.user.id ? String(task.assignedBy) : String(task.assignedTo);
    if (notifyUserId !== req.user.id) {
      sendPushToUser(notifyUserId, { title: "New comment on a task", body: clean(text, 120), url: "/" })
        .catch((err) => console.error("Push notify failed:", err.message));
    }
  })
);

/* ---------- attachments ---------- */

// POST /api/tasks/:id/attachments — multipart/form-data, field name "file"
router.post(
  "/:id/attachments",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (req.user.role !== "admin" && String(task.assignedTo) !== req.user.id) {
      return res.status(403).json({ error: "You can only attach files to your own tasks" });
    }
    if (!req.file) return res.status(400).json({ error: "No file uploaded (field name must be 'file')" });

    const attachment = await Attachment.create({
      organization: req.user.organization,
      task: task._id,
      uploadedBy: req.user.id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    });
    res.status(201).json({
      id: attachment._id, originalName: attachment.originalName, mimeType: attachment.mimeType,
      size: attachment.size, url: `/uploads/${attachment.filename}`, createdAt: attachment.createdAt,
    });
  })
);

// GET /api/tasks/:id/attachments
router.get(
  "/:id/attachments",
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (req.user.role !== "admin" && String(task.assignedTo) !== req.user.id) {
      return res.status(403).json({ error: "You can only view attachments on your own tasks" });
    }
    const attachments = await Attachment.find({ task: task._id }).sort({ createdAt: 1 });
    res.json(attachments.map((a) => ({
      id: a._id, originalName: a.originalName, mimeType: a.mimeType, size: a.size,
      url: `/uploads/${a.filename}`, createdAt: a.createdAt,
    })));
  })
);

// DELETE /api/tasks/:id/attachments/:attachmentId
router.delete(
  "/:id/attachments/:attachmentId",
  asyncHandler(async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!task) return res.status(404).json({ error: "Task not found" });
    const attachment = await Attachment.findOne({ _id: req.params.attachmentId, task: task._id });
    if (!attachment) return res.status(404).json({ error: "Attachment not found" });
    const canDelete = req.user.role === "admin" || String(attachment.uploadedBy) === req.user.id;
    if (!canDelete) return res.status(403).json({ error: "You can only remove files you uploaded" });

    await fs.promises.unlink(attachment.path || "").catch(() => {});
    await attachment.deleteOne();
    res.json({ ok: true });
  })
);

module.exports = router;
