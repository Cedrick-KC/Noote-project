const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    text: { type: String, required: true },
    time: { type: String, default: "" },
    done: { type: Boolean, default: false },
    version: { type: Number, default: 0 },
    operationId: { type: String, sparse: true, unique: true },
  },
  { timestamps: true }
);

reminderSchema.pre("save", function incrementVersion(next) {
  if (!this.isNew && this.isModified()) this.version += 1;
  next();
});

module.exports = mongoose.model("Reminder", reminderSchema);
