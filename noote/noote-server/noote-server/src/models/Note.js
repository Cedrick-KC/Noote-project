const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, default: "Untitled note" },
    content: { type: String, default: "" },
    version: { type: Number, default: 0 },
    operationId: { type: String, sparse: true, unique: true },
  },
  { timestamps: true }
);

noteSchema.pre("save", function incrementVersion(next) {
  if (!this.isNew && this.isModified()) this.version += 1;
  next();
});

module.exports = mongoose.model("Note", noteSchema);
