const express = require("express");
const Reminder = require("../models/Reminder");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const reminders = await Reminder.find({ owner: req.user.id }).sort({ createdAt: -1 });
  res.json(reminders);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { text, time } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: "text is required" });
  const reminder = await Reminder.create({
    owner: req.user.id, organization: req.user.organization, text: text.trim(), time: time || "",
  });
  res.status(201).json(reminder);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOne({ _id: req.params.id, owner: req.user.id });
  if (!reminder) return res.status(404).json({ error: "Reminder not found" });
  const { text, time, done } = req.body || {};
  if (typeof text === "string") reminder.text = text;
  if (typeof time === "string") reminder.time = time;
  if (typeof done === "boolean") reminder.done = done;
  await reminder.save();
  res.json(reminder);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!reminder) return res.status(404).json({ error: "Reminder not found" });
  res.json({ ok: true });
}));

module.exports = router;
