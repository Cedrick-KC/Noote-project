// Small, dependency-free validation helpers. Every route that accepts user
// input should run it through these rather than trusting req.body directly —
// Mongoose's schema (strict mode, maxlength) is the second line of defense,
// this is the first, and it gives cleaner error messages.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(value, { max = 1000 } = {}) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function isValidEmail(value) {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value.trim());
}

function isOneOf(value, allowed) {
  return allowed.includes(value);
}

function isValidDateString(value) {
  // Expects YYYY-MM-DD or null/undefined
  if (value === null || value === undefined || value === "") return true;
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// Trims a string and caps its length — use for anything stored, to guard
// against absurdly large payloads even when a maxlength exists on the schema.
function clean(value, max = 1000) {
  if (typeof value !== "string") return value;
  return value.trim().slice(0, max);
}

module.exports = { isNonEmptyString, isValidEmail, isOneOf, isValidDateString, clean };
