const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Organization = require("../models/Organization");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { logAudit } = require("../utils/audit");
const { isNonEmptyString, isValidEmail, clean } = require("../utils/validate");

const router = express.Router();
router.use(requireAuth);

// GET /api/users — list everyone in my organization (admin only)
router.get(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const users = await User.find({ organization: req.user.organization }).sort({ createdAt: 1 });
    res.json(users.map((u) => u.toSafeJSON()));
  })
);

// POST /api/users — admin creates a new worker account in their org.
// Since the admin (not the worker) supplies this email, we treat it as
// trusted and mark it verified immediately — no separate verification step
// for admin-created workers.
router.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body || {};
    if (!isNonEmptyString(name, { max: 200 })) return res.status(400).json({ error: "name is required" });
    if (!isValidEmail(email)) return res.status(400).json({ error: "A valid email is required" });
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const org = await Organization.findById(req.user.organization);
    const seatCount = await User.countDocuments({ organization: org._id, active: true });
    if (seatCount >= org.seatLimit) {
      return res.status(402).json({
        error: `Seat limit reached (${org.seatLimit} on the ${org.plan} plan). Upgrade your plan to add more workers.`,
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "An account with that email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    const worker = await User.create({
      name: clean(name, 200), email: email.toLowerCase().trim(), passwordHash,
      role: role === "admin" ? "admin" : "worker",
      organization: org._id,
      emailVerified: true,
    });

    logAudit(req, "user.created", "User", worker._id, { name: worker.name, email: worker.email, role: worker.role });
    res.status(201).json(worker.toSafeJSON());
  })
);

// DELETE /api/users/:id — deactivate a worker (soft delete, keeps task history intact)
router.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (String(user._id) === req.user.id) return res.status(400).json({ error: "You can't deactivate your own account" });

    user.active = false;
    await user.save();
    logAudit(req, "user.deactivated", "User", user._id, { name: user.name, email: user.email });
    res.json({ ok: true });
  })
);

// PATCH /api/users/:id/reactivate — bring back a deactivated worker
router.patch(
  "/:id/reactivate",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.user.organization);
    const activeCount = await User.countDocuments({ organization: org._id, active: true });
    if (activeCount >= org.seatLimit) {
      return res.status(402).json({ error: `Seat limit reached (${org.seatLimit} on the ${org.plan} plan). Upgrade your plan first.` });
    }

    const user = await User.findOne({ _id: req.params.id, organization: req.user.organization });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.active = true;
    await user.save();
    logAudit(req, "user.reactivated", "User", user._id, { name: user.name, email: user.email });
    res.json(user.toSafeJSON());
  })
);

// PATCH /api/users/me — any logged-in user updates their own display name
router.patch(
  "/me",
  asyncHandler(async (req, res) => {
    const { name } = req.body || {};
    if (!isNonEmptyString(name, { max: 200 })) return res.status(400).json({ error: "name is required" });
    const user = await User.findById(req.user.id);
    user.name = clean(name, 200);
    await user.save();
    res.json(user.toSafeJSON());
  })
);

module.exports = router;
