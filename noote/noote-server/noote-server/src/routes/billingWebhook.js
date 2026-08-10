const Organization = require("../models/Organization");
const { getStripe } = require("../utils/stripe");
const { PLANS } = require("../config/plans");

// This is a plain handler (not an express.Router) because it must be mounted
// with express.raw() BEFORE the app-wide express.json() middleware —
// Stripe's signature check needs the exact raw request bytes.
async function stripeWebhookHandler(req, res) {
  const stripe = getStripe();
  if (!stripe) return res.status(500).send("Billing not configured");

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature check failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orgId = session.metadata?.organizationId;
        const planKey = session.metadata?.plan;
        if (orgId && planKey && PLANS[planKey]) {
          await Organization.findByIdAndUpdate(orgId, {
            plan: planKey,
            seatLimit: PLANS[planKey].seatLimit,
            subscriptionStatus: "active",
            stripeSubscriptionId: session.subscription,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const org = await Organization.findOne({ stripeCustomerId: sub.customer });
        if (org) {
          org.subscriptionStatus = sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";
          await org.save();
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const org = await Organization.findOne({ stripeCustomerId: sub.customer });
        if (org) {
          org.plan = "trial";
          org.seatLimit = PLANS.trial.seatLimit;
          org.subscriptionStatus = "canceled";
          await org.save();
        }
        break;
      }
      default:
        break; // ignore events we don't act on
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Error handling Stripe webhook:", err.message);
    res.status(500).json({ error: "Webhook handler failed" });
  }
}

module.exports = { stripeWebhookHandler };
