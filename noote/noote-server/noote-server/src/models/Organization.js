const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Monetization hooks — enforce a seat limit per plan, ready for a
    // Stripe/billing integration to update these fields later.
    plan: { type: String, enum: ["trial", "starter", "growth", "business"], default: "trial" },
    seatLimit: { type: Number, default: 5 },
    subscriptionStatus: { type: String, enum: ["active", "past_due", "canceled", "trialing"], default: "trialing" },
    trialEndsAt: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", organizationSchema);
