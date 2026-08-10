const express = require("express");
const PushSubscription = require("../models/PushSubscription");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

// GET /api/push/vapid-public-key — public, the browser needs this to subscribe
router.get("/vapid-public-key", (req, res) => {
  if (!process.env.VAPID_PUBLIC_KEY) return res.status(500).json({ error: "Push is not configured on this server" });
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.use(requireAuth);

// POST /api/push/subscribe — save (or refresh) this device's push subscription
router.post(
  "/subscribe",
  asyncHandler(async (req, res) => {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "A valid push subscription object is required" });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { endpoint, keys, user: req.user.id, organization: req.user.organization },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ ok: true });
  })
);

// DELETE /api/push/subscribe — stop notifying this device
router.delete(
  "/subscribe",
  asyncHandler(async (req, res) => {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: "endpoint is required" });
    await PushSubscription.deleteOne({ endpoint, user: req.user.id });
    res.json({ ok: true });
  })
);

module.exports = router;
