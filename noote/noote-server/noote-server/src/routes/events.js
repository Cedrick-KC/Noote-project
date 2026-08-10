const express = require("express");
const Event = require("../models/Event");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const events = await Event.find({ owner: req.user.id }).sort({ date: 1 });
  res.json(events);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { title, date, time } = req.body || {};
  if (!title || !date) return res.status(400).json({ error: "title and date are required" });
  const event = await Event.create({
    owner: req.user.id, organization: req.user.organization, title, date, time: time || "",
  });
  res.status(201).json(event);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const event = await Event.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json({ ok: true });
}));

module.exports = router;
