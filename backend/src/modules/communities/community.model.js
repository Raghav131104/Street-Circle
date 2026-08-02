const mongoose = require("mongoose");
const { objectId, pointSchema } = require("../../infrastructure/database/model-utils");

const communitySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  slug: { type: String, required: true, lowercase: true, trim: true },
  description: { type: String, required: true, trim: true, maxlength: 1500 },
  center: { type: pointSchema, required: true },
  coverageRadiusMeters: { type: Number, required: true, min: 100, max: 50_000 },
  ownerId: objectId("User"),
  visibility: { type: String, enum: ["public", "private"], default: "public", required: true },
  joinPolicy: { type: String, enum: ["open", "approval"], default: "approval", required: true },
  rules: [{ type: String, trim: true, maxlength: 300 }],
  status: { type: String, enum: ["active", "archived"], default: "active", required: true },
}, { timestamps: true });

communitySchema.index({ slug: 1 }, { unique: true, name: "uq_communities_slug" });
communitySchema.index({ center: "2dsphere" }, { name: "geo_communities_center" });
communitySchema.index({ status: 1, visibility: 1, createdAt: -1, _id: -1 }, { name: "ix_communities_available" });

module.exports = mongoose.models.Community || mongoose.model("Community", communitySchema);
