const express = require("express");
const Organization = require("../models/Organization");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { getStripe } = require("../utils/stripe");
const { PLANS } = require("../config/plans");

const router = express.Router();
router.use(requireAuth);

// GET /api/billing/plans — list plans with placeholder pricing, and which one this org is on
router.get(
  "/plans",
  asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.user.organization);
    res.json({
      currentPlan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
      seatLimit: org.seatLimit,
      trialEndsAt: org.trialEndsAt,
      plans: Object.values(PLANS).map((p) => ({
        key: p.key, name: p.name, seatLimit: p.seatLimit, priceRWF: p.priceRWF,
        description: p.description, available: p.key === "trial" || !!p.stripePriceId,
      })),
    });
  })
);

// POST /api/billing/checkout-session — admin starts (or changes to) a paid plan
router.post(
  "/checkout-session",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(500).json({ error: "Billing is not configured on this server (missing STRIPE_SECRET_KEY)" });

    const { plan } = req.body || {};
    const planConfig = PLANS[plan];
    if (!planConfig || !planConfig.stripePriceId) {
      return res.status(400).json({ error: "That plan isn't available yet — set its Stripe Price ID in the server's .env" });
    }

    const org = await Organization.findById(req.user.organization);
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { organizationId: String(org._id) },
      });
      customerId = customer.id;
      org.stripeCustomerId = customerId;
      await org.save();
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      success_url: `${frontendUrl}/?billing=success`,
      cancel_url: `${frontendUrl}/?billing=cancel`,
      metadata: { organizationId: String(org._id), plan },
      subscription_data: { metadata: { organizationId: String(org._id), plan } },
    });

    res.json({ url: session.url });
  })
);

// POST /api/billing/portal-session — admin manages/cancels their existing subscription
router.post(
  "/portal-session",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(500).json({ error: "Billing is not configured on this server (missing STRIPE_SECRET_KEY)" });

    const org = await Organization.findById(req.user.organization);
    if (!org.stripeCustomerId) {
      return res.status(400).json({ error: "No billing account yet — subscribe to a plan first" });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${frontendUrl}/`,
    });

    res.json({ url: session.url });
  })
);

module.exports = router;
