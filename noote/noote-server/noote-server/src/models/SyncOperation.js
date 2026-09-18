const mongoose = require("mongoose");

const syncOperationSchema = new mongoose.Schema(
  {
    operationId: { type: String, required: true, unique: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    resource: { type: String, required: true, enum: ["notes", "tasks", "reminders", "events"] },
    resourceId: { type: String, required: true },
    method: { type: String, required: true, enum: ["DELETE"] },
    status: { type: Number, required: true },
    response: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

syncOperationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model("SyncOperation", syncOperationSchema);
