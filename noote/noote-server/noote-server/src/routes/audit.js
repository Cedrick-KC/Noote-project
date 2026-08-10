const express = require("express");
const AuditLog = require("../models/AuditLog");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/audit?limit=50&before=<ISO date> — recent activity for this organization, newest first
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const query = { organization: req.user.organization };
    if (req.query.before) query.createdAt = { $lt: new Date(req.query.before) };

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(limit).populate("actor", "name email");
    res.json(logs);
  })
);

module.exports = router;
