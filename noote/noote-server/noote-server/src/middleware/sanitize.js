// Global, coarse-grained sanitization applied to every JSON request body:
// trims strings, strips null bytes/control characters, and caps any single
// string field at a generous length so nothing absurd reaches a route or
// the database. Routes still do their own specific validation (see
// utils/validate.js) — this is a blunt safety net, not a replacement for it.

const MAX_FIELD_LENGTH = 10000;

function cleanValue(value, depth = 0) {
  if (depth > 5) return value; // avoid pathological nesting
  if (typeof value === "string") {
    // eslint-disable-next-line no-control-regex
    return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").slice(0, MAX_FIELD_LENGTH);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 500).map((v) => cleanValue(v, depth + 1));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).slice(0, 100)) {
      out[key] = cleanValue(value[key], depth + 1);
    }
    return out;
  }
  return value;
}

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = cleanValue(req.body);
  }
  next();
}

module.exports = { sanitizeBody };
