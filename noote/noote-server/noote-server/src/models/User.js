const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "worker"], default: "worker" },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
    active: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    verifyTokenHash: { type: String, default: null },
    verifyTokenExpires: { type: Date, default: null },
    resetTokenHash: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    organization: this.organization,
    active: this.active,
    emailVerified: this.emailVerified,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
