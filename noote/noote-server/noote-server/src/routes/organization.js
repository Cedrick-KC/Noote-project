const express = require("express");
const Organization = require("../models/Organization");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth);

// GET /api/organization
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.user.organization);
    res.json(org);
  })
);

// PATCH /api/organization — admin renames the organization
router.patch(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { name } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "name is required" });
    const org = await Organization.findById(req.user.organization);
    org.name = name.trim();
    await org.save();
    res.json(org);
  })
);

module.exports = router;
