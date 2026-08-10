const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Organization = require("../models/Organization");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendEmail } = require("../utils/email");
const { logAudit } = require("../utils/audit");
const { isNonEmptyString, isValidEmail, clean } = require("../utils/validate");

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
}

async function sendVerificationEmail(user) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  user.verifyTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  user.verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
  const verifyUrl = `${frontendUrl}/?verifyEmail=${encodeURIComponent(user.email)}&verifyToken=${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your Noote account",
    text: `Welcome to Noote. Verify your email to confirm this account is yours:\n\n${verifyUrl}\n\nThis link is valid for 24 hours.`,
  });
}

// POST /api/auth/register-org
// Creates a brand-new organization plus its first admin account.
router.post(
  "/register-org",
  asyncHandler(async (req, res) => {
    const { orgName, name, email, password } = req.body || {};
    if (!isNonEmptyString(orgName, { max: 200 })) return res.status(400).json({ error: "orgName is required" });
    if (!isNonEmptyString(name, { max: 200 })) return res.status(400).json({ error: "name is required" });
    if (!isValidEmail(email)) return res.status(400).json({ error: "A valid email is required" });
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "An account with that email already exists" });

    const org = await Organization.create({ name: clean(orgName, 200) });
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await User.create({
      name: clean(name, 200), email: email.toLowerCase().trim(), passwordHash, role: "admin", organization: org._id,
    });

    sendVerificationEmail(admin).catch((err) => console.error("Verification email failed:", err.message));

    const token = signToken(admin);
    res.status(201).json({ token, user: admin.toSafeJSON(), organization: org });
  })
);

// POST /api/auth/login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !user.active) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const org = await Organization.findById(user.organization);
    const token = signToken(user);
    res.json({ token, user: user.toSafeJSON(), organization: org });
  })
);

// GET /api/auth/me
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    const org = await Organization.findById(req.user.organization);
    res.json({ user: user.toSafeJSON(), organization: org });
  })
);

// POST /api/auth/verify-email
router.post(
  "/verify-email",
  asyncHandler(async (req, res) => {
    const { email, token } = req.body || {};
    if (!email || !token) return res.status(400).json({ error: "email and token are required" });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !user.verifyTokenHash || !user.verifyTokenExpires || user.verifyTokenExpires < new Date()) {
      return res.status(400).json({ error: "That verification link is invalid or has expired — request a new one." });
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (tokenHash !== user.verifyTokenHash) {
      return res.status(400).json({ error: "That verification link is invalid or has expired — request a new one." });
    }

    user.emailVerified = true;
    user.verifyTokenHash = null;
    user.verifyTokenExpires = null;
    await user.save();
    res.json({ ok: true });
  })
);

// POST /api/auth/resend-verification
router.post(
  "/resend-verification",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (user.emailVerified) return res.json({ ok: true, alreadyVerified: true });
    await sendVerificationEmail(user);
    res.json({ ok: true });
  })
);

// POST /api/auth/change-password
router.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "currentPassword and newPassword are required" });
    if (newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });

    const user = await User.findById(req.user.id);
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true });
  })
);

// POST /api/auth/forgot-password
// Always returns { ok: true } regardless of whether the email exists,
// so this endpoint can't be used to discover which emails are registered.
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email is required" });

    const user = await User.findOne({ email: email.toLowerCase(), active: true });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      user.resetTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
      const resetUrl = `${frontendUrl}/?resetEmail=${encodeURIComponent(user.email)}&resetToken=${rawToken}`;
      await sendEmail({
        to: user.email,
        subject: "Reset your Noote password",
        text: `Someone requested a password reset for your Noote account.\n\nReset it here (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
      });
    }

    res.json({ ok: true, message: "If that email is registered, a reset link has been sent." });
  })
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { email, token, newPassword } = req.body || {};
    if (!email || !token || !newPassword) return res.status(400).json({ error: "email, token and newPassword are required" });
    if (newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

    const user = await User.findOne({ email: email.toLowerCase(), active: true });
    if (!user || !user.resetTokenHash || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return res.status(400).json({ error: "That reset link is invalid or has expired — request a new one." });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (tokenHash !== user.resetTokenHash) {
      return res.status(400).json({ error: "That reset link is invalid or has expired — request a new one." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetTokenHash = null;
    user.resetTokenExpires = null;
    await user.save();

    res.json({ ok: true });
  })
);

module.exports = router;
