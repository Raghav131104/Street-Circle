const mongoose = require("mongoose");
const { objectId, pointSchema } = require("../../infrastructure/database/model-utils");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, maxlength: 40 },
  usernameNormalized: { type: String, required: true, lowercase: true, trim: true, select: false },
  email: { type: String, required: true, trim: true, maxlength: 254 },
  emailNormalized: { type: String, required: true, lowercase: true, trim: true, select: false },
  passwordHash: { type: String, required: true, select: false },
  profile: {
    displayName: { type: String, trim: true, maxlength: 80 },
    avatarMediaId: objectId("Media", false),
    bio: { type: String, trim: true, maxlength: 500 },
  },
  homeLocation: { type: pointSchema, required: false },
  status: { type: String, enum: ["active", "suspended", "deleted"], default: "active", required: true },
}, { timestamps: true, minimize: false });

userSchema.index({ usernameNormalized: 1 }, { unique: true, name: "uq_users_username_normalized" });
userSchema.index({ emailNormalized: 1 }, { unique: true, name: "uq_users_email_normalized" });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
