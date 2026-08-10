const AuditLog = require("../models/AuditLog");

// Fire-and-forget: never let audit logging break the actual request.
// action examples: "task.assigned", "task.reassigned", "task.deleted",
// "user.created", "user.deactivated", "user.reactivated", "organization.renamed"
function logAudit(req, action, targetType, targetId, meta = {}) {
  AuditLog.create({
    organization: req.user.organization,
    actor: req.user.id,
    action,
    targetType,
    targetId: targetId || null,
    meta,
  }).catch((err) => console.error("Audit log write failed:", err.message));
}

module.exports = { logAudit };
