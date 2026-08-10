// Placeholder pricing in RWF — adjust freely, these are not final numbers.
// Each plan (except trial) needs a matching Stripe Price ID set in .env
// before checkout will work for that plan.
const PLANS = {
  trial: {
    key: "trial", name: "Trial", seatLimit: 5, priceRWF: 0,
    stripePriceId: null,
    description: "14-day trial, up to 5 workers.",
  },
  starter: {
    key: "starter", name: "Starter", seatLimit: 5, priceRWF: 15000,
    stripePriceId: process.env.STRIPE_PRICE_STARTER || null,
    description: "Up to 5 workers.",
  },
  growth: {
    key: "growth", name: "Growth", seatLimit: 20, priceRWF: 45000,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH || null,
    description: "Up to 20 workers.",
  },
  business: {
    key: "business", name: "Business", seatLimit: 100, priceRWF: 120000,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS || null,
    description: "Up to 100 workers.",
  },
};

module.exports = { PLANS };
