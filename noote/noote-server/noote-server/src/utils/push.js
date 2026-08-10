const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys are not set — push notifications are disabled. See README.");
    return;
  }
  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:admin@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

// Sends a notification to every device a user has subscribed on.
// Silently drops subscriptions that are no longer valid (uninstalled / expired).
async function sendPushToUser(userId, payload) {
  ensureConfigured();
  if (!configured) return;

  const subs = await PushSubscription.find({ user: userId });
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          body
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id }); // expired/unsubscribed
        } else {
          console.error("Push send failed:", err.message);
        }
      }
    })
  );
}

module.exports = { sendPushToUser };
