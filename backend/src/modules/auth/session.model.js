const mongoose = require("mongoose");
const { objectId } = require("../../infrastructure/database/model-utils");

const sessionSchema = new mongoose.Schema({
  userId: objectId("User"),
  secretHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  createdByIpHash: { type: String, select: false },
  userAgent: { type: String, maxlength: 300, select: false },
}, { timestamps: true });

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "ttl_sessions_expiry" });
sessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: -1 }, { name: "ix_sessions_user_active" });

module.exports = mongoose.models.Session || mongoose.model("Session", sessionSchema);
