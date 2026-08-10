const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
