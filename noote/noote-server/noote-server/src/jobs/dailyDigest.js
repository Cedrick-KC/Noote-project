const cron = require("node-cron");
const User = require("../models/User");
const Task = require("../models/Task");
const { sendPushToUser } = require("../utils/push");

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function runDailyDigest() {
  const today = todayISO();
  const workers = await User.find({ active: true });

  for (const worker of workers) {
    const tasks = await Task.find({
      assignedTo: worker._id,
      done: false,
      $or: [{ dueDate: today }, { dueDate: null }],
    });
    if (tasks.length === 0) continue;

    const preview = tasks.slice(0, 3).map((t) => t.text).join(", ");
    const body = tasks.length > 3 ? `${preview}, and ${tasks.length - 3} more` : preview;

    await sendPushToUser(worker._id, {
      title: `${tasks.length} task${tasks.length > 1 ? "s" : ""} for today`,
      body,
      url: "/",
    }).catch((err) => console.error(`Digest push failed for ${worker.email}:`, err.message));
  }
}

// Default: every day at 7:00 AM server time. Override with DIGEST_CRON_SCHEDULE
// in .env (cron syntax) — and set TZ in your host's env vars if server time
// isn't the timezone your workers are in.
function startDailyDigestJob() {
  const schedule = process.env.DIGEST_CRON_SCHEDULE || "0 7 * * *";
  cron.schedule(schedule, () => {
    runDailyDigest().catch((err) => console.error("Daily digest job failed:", err.message));
  });
  console.log(`Daily digest scheduled: "${schedule}"`);
}

module.exports = { startDailyDigestJob, runDailyDigest };
