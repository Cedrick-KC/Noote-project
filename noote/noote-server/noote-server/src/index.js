require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { connectDB } = require("./db");
const { sanitizeBody } = require("./middleware/sanitize");
const { UPLOAD_DIR } = require("./middleware/upload");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const taskRoutes = require("./routes/tasks");
const noteRoutes = require("./routes/notes");
const reminderRoutes = require("./routes/reminders");
const eventRoutes = require("./routes/events");
const assistantRoutes = require("./routes/assistant");
const pushRoutes = require("./routes/push");
const billingRoutes = require("./routes/billing");
const organizationRoutes = require("./routes/organization");
const auditRoutes = require("./routes/audit");
const { stripeWebhookHandler } = require("./routes/billingWebhook");
const { startDailyDigestJob } = require("./jobs/dailyDigest");

const app = express();
app.set("trust proxy", 1); // needed for correct rate-limit IPs behind Render/Railway/etc.

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // uploaded files need to load from the frontend's origin
}));

const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true,
}));

if (process.env.NODE_ENV !== "test") app.use(morgan("tiny"));

// Stripe webhook needs the exact raw request body to verify its signature,
// so it's mounted BEFORE express.json() below, and only for this one path.
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

app.use(express.json({ limit: "1mb" }));
app.use(sanitizeBody);

// Uploaded task attachments (images, PDFs, docs)
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "7d" }));

// Auth endpoints get a tighter limit (brute-force protection).
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use("/api/auth", authLimiter);

// Everything else under /api gets a generous general limit — enough for
// normal use, tight enough to blunt scripted abuse.
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/audit", auditRoutes);

// Anything under /api that didn't match a route above
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// Central error handler — translates common error types into clean JSON
// responses instead of leaking stack traces or falling back to a bare 500.
app.use((err, req, res, next) => {
  if (err && err.name === "MulterError") {
    return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message });
  }
  if (err && err.name === "ValidationError") {
    return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join("; ") });
  }
  if (err && err.name === "CastError") {
    return res.status(400).json({ error: "Invalid ID format" });
  }
  if (err && err.code === 11000) {
    return res.status(409).json({ error: "That value is already in use" });
  }
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong" });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Noote API listening on port ${PORT}`));
    startDailyDigestJob();
  })
  .catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
