const express = require("express");
const Reminder = require("../models/Reminder");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth);
router.get("/", asyncHandler(async (req, res) => res.json(await Reminder.find({ owner: req.user.id }).sort({ createdAt: -1 }))));
router.post("/", asyncHandler(async (req, res) => {
  const { text, time, operationId } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: "text is required" });
  if (operationId) { const existing = await Reminder.findOne({ operationId, owner: req.user.id }); if (existing) return res.status(200).json(existing); }
  const reminder = await Reminder.create({ owner: req.user.id, organization: req.user.organization, text: text.trim(), time: time || "", operationId });
  res.status(201).json(reminder);
}));
router.patch("/:id", asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOne({ _id: req.params.id, owner: req.user.id });
  if (!reminder) return res.status(404).json({ error: "Reminder not found" });
  const { text, time, done, operationId, expectedVersion } = req.body || {};
  if (operationId && reminder.operationId === operationId) return res.json(reminder);
  if (expectedVersion !== undefined && Number(expectedVersion) !== reminder.version) return res.status(409).json({ error: "Reminder changed on another device", conflict: true, server: reminder });
  if (typeof text === "string") reminder.text = text;
  if (typeof time === "string") reminder.time = time;
  if (typeof done === "boolean") reminder.done = done;
  if (operationId) reminder.operationId = operationId;
  await reminder.save(); res.json(reminder);
}));
router.delete("/:id", asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOne({ _id: req.params.id, owner: req.user.id });
  if (!reminder) return res.status(404).json({ error: "Reminder not found" });
  const { operationId, expectedVersion } = req.body || {};
  if (operationId && reminder.operationId === operationId) return res.json({ ok: true, duplicate: true });
  if (expectedVersion !== undefined && Number(expectedVersion) !== reminder.version) return res.status(409).json({ error: "Reminder changed on another device", conflict: true, server: reminder });
  await reminder.deleteOne(); res.json({ ok: true });
}));
module.exports = router;
