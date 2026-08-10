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
  const { title, content } = req.body || {};
  const note = await Note.create({
    owner: req.user.id, organization: req.user.organization,
    title: title || "Untitled note", content: content || "",
  });
  res.status(201).json(note);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, owner: req.user.id });
  if (!note) return res.status(404).json({ error: "Note not found" });
  const { title, content } = req.body || {};
  if (typeof title === "string") note.title = title;
  if (typeof content === "string") note.content = content;
  await note.save();
  res.json(note);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json({ ok: true });
}));

module.exports = router;
