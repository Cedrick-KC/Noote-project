const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    note: { type: mongoose.Schema.Types.ObjectId, ref: "Note", default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true }, // name on disk
    originalName: { type: String, required: true }, // name to show the user
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true }, // full disk path, used to delete the file later
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attachment", attachmentSchema);
