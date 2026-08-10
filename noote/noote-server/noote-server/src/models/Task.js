const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    description: { type: String, default: "", maxlength: 5000 },
    priority: { type: String, enum: ["low", "normal", "high"], default: "normal" },
    dueDate: { type: String, default: null }, // stored as YYYY-MM-DD for simplicity
    done: { type: Boolean, default: false },

    // Who the task is for, and who put it there.
    // assignedBy === assignedTo means it's a personal, self-created task.
    // assignedBy !== assignedTo means an admin assigned it to a worker.
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Recurrence: "none" (default) or a repeat frequency. When a recurring
    // task is marked done, the API automatically creates the next occurrence
    // with dueDate advanced by this frequency (see routes/tasks.js).
    recurrence: { type: String, enum: ["none", "daily", "weekly", "monthly"], default: "none" },
  },
  { timestamps: true }
);

taskSchema.index({ organization: 1, assignedTo: 1 });

module.exports = mongoose.model("Task", taskSchema);
