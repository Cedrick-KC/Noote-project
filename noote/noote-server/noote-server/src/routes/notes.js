const express = require("express");
const Note = require("../models/Note");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const notes = await Note.find({ owner: req.user.id }).sort({ createdAt: -1 });
  res.json(notes);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { title, content, operationId } = req.body || {};
  if (operationId) {
    const existing = await Note.findOne({ operationId, owner: req.user.id });
    if (existing) return res.status(200).json(existing);
  }
  const note = await Note.create({ owner: req.user.id, organization: req.user.organization, title: title || "Untitled note", content: content || "", operationId });
  res.status(201).json(note);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, owner: req.user.id });
  if (!note) return res.status(404).json({ error: "Note not found" });
  const { title, content, operationId, expectedVersion } = req.body || {};
  if (operationId && note.operationId === operationId) return res.json(note);
  if (expectedVersion !== undefined && Number(expectedVersion) !== note.version) return res.status(409).json({ error: "Note changed on another device", conflict: true, server: note });
  if (typeof title === "string") note.title = title;
  if (typeof content === "string") note.content = content;
  if (operationId) note.operationId = operationId;
  await note.save();
  res.json(note);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, owner: req.user.id });
  if (!note) return res.status(404).json({ error: "Note not found" });
  const { operationId, expectedVersion } = req.body || {};
  if (operationId && note.operationId === operationId) return res.json({ ok: true, duplicate: true });
  if (expectedVersion !== undefined && Number(expectedVersion) !== note.version) return res.status(409).json({ error: "Note changed on another device", conflict: true, server: note });
  await note.deleteOne();
  res.json({ ok: true });
}));

module.exports = router;
