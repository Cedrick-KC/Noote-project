const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true }, // e.g. "task.assigned", "user.deactivated"
    targetType: { type: String, required: true }, // e.g. "Task", "User", "Organization"
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} }, // small human-readable context, e.g. { text: "...", workerName: "..." }
  },
  { timestamps: true }
);

auditLogSchema.index({ organization: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
