const mongoose = require("mongoose");

const taskCommentSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

taskCommentSchema.index({ task: 1, createdAt: 1 });

module.exports = mongoose.model("TaskComment", taskCommentSchema);
