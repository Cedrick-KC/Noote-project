// Advances a YYYY-MM-DD date string by one occurrence of the given frequency.
// If dueDate is missing, uses today as the base so a recurring task always
// gets a real next date instead of staying null forever.
function advanceDate(dueDate, frequency) {
  const base = dueDate ? new Date(dueDate + "T00:00:00") : new Date();
  if (frequency === "daily") base.setDate(base.getDate() + 1);
  else if (frequency === "weekly") base.setDate(base.getDate() + 7);
  else if (frequency === "monthly") base.setMonth(base.getMonth() + 1);
  return base.toISOString().slice(0, 10);
}

module.exports = { advanceDate };
