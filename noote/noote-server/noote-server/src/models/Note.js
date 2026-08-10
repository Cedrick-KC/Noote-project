const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, default: "Untitled note" },
    content: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
