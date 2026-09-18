const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, default: "" },
    version: { type: Number, default: 0 },
    operationId: { type: String, sparse: true, unique: true },
  },
  { timestamps: true }
);

eventSchema.pre("save", function incrementVersion(next) {
  if (!this.isNew && this.isModified()) this.version += 1;
  next();
});

module.exports = mongoose.model("Event", eventSchema);
