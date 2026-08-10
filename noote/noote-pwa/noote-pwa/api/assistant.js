// Example serverless function (Vercel format) that proxies chat requests to the
// Anthropic API. Deploy this alongside the static site so the app's assistant
// endpoint (/api/assistant) has something real to call.
//
// IMPORTANT: never put your Anthropic API key in the front-end code. Set it
// as an environment variable (ANTHROPIC_API_KEY) in your hosting provider's
// dashboard instead — this function reads it server-side only.
//
// Works as-is on Vercel. For Netlify, move this into netlify/functions/assistant.js
// and adapt the export to `exports.handler = async (event) => {...}`.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
    return;
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages,
      }),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Upstream request failed" });
  }
}
