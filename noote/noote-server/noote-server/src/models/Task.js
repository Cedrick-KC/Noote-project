const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    description: { type: String, default: "", maxlength: 5000 },
    priority: { type: String, enum: ["low", "normal", "high"], default: "normal" },
    dueDate: { type: String, default: null },
    done: { type: Boolean, default: false },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recurrence: { type: String, enum: ["none", "daily", "weekly", "monthly"], default: "none" },
    version: { type: Number, default: 0 },
    operationId: { type: String, sparse: true, unique: true },
  },
  { timestamps: true }
);

taskSchema.index({ organization: 1, assignedTo: 1 });
taskSchema.pre("save", function incrementVersion(next) {
  if (!this.isNew && this.isModified()) this.version += 1;
  next();
});

module.exports = mongoose.model("Task", taskSchema);
