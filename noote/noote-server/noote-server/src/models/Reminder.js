const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    text: { type: String, required: true },
    time: { type: String, default: "" },
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reminder", reminderSchema);
