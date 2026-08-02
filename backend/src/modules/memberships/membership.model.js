const mongoose = require("mongoose");
const { objectId } = require("../../infrastructure/database/model-utils");

const membershipSchema = new mongoose.Schema({
  userId: objectId("User"),
  communityId: objectId("Community"),
  role: { type: String, enum: ["owner", "moderator", "member"], default: "member", required: true },
  status: { type: String, enum: ["pending", "active", "rejected", "blocked", "left"], required: true },
  joinedAt: { type: Date, default: null },
  decidedBy: objectId("User", false),
  decidedAt: { type: Date, default: null },
}, { timestamps: true });

membershipSchema.index({ userId: 1, communityId: 1 }, { unique: true, name: "uq_memberships_user_community" });
membershipSchema.index({ communityId: 1, status: 1, role: 1, createdAt: -1 }, { name: "ix_memberships_community_queue" });
membershipSchema.index({ userId: 1, status: 1, createdAt: -1 }, { name: "ix_memberships_user" });

module.exports = mongoose.models.Membership || mongoose.model("Membership", membershipSchema);
