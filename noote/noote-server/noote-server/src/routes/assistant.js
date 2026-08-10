const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth);

// POST /api/assistant
// Proxies to Anthropic so the API key never reaches the browser.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });

    const { messages } = req.body || {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: "messages array is required" });

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages }),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  })
);

module.exports = router;
