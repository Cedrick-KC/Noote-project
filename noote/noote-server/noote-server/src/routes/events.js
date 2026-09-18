const express = require("express");
const Event = require("../models/Event");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const router = express.Router();
router.use(requireAuth);
router.get("/", asyncHandler(async (req, res) => res.json(await Event.find({ owner: req.user.id }).sort({ date: 1 }))));
router.post("/", asyncHandler(async (req, res) => {
  const { title, date, time, operationId } = req.body || {};
  if (!title || !date) return res.status(400).json({ error: "title and date are required" });
  if (operationId) { const existing = await Event.findOne({ operationId, owner: req.user.id }); if (existing) return res.status(200).json(existing); }
  const event = await Event.create({ owner: req.user.id, organization: req.user.organization, title, date, time: time || "", operationId });
  res.status(201).json(event);
}));
router.patch("/:id", asyncHandler(async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, owner: req.user.id });
  if (!event) return res.status(404).json({ error: "Event not found" });
  const { title, date, time, operationId, expectedVersion } = req.body || {};
  if (operationId && event.operationId === operationId) return res.json(event);
  if (expectedVersion !== undefined && Number(expectedVersion) !== event.version) return res.status(409).json({ error: "Event changed on another device", conflict: true, server: event });
  if (typeof title === "string") event.title = title;
  if (typeof date === "string") event.date = date;
  if (typeof time === "string") event.time = time;
  if (operationId) event.operationId = operationId;
  await event.save(); res.json(event);
}));
router.delete("/:id", asyncHandler(async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, owner: req.user.id });
  if (!event) return res.status(404).json({ error: "Event not found" });
  const { operationId, expectedVersion } = req.body || {};
  if (operationId && event.operationId === operationId) return res.json({ ok: true, duplicate: true });
  if (expectedVersion !== undefined && Number(expectedVersion) !== event.version) return res.status(409).json({ error: "Event changed on another device", conflict: true, server: event });
  await event.deleteOne(); res.json({ ok: true });
}));
module.exports = router;
