const mongoose = require("mongoose");
const { objectId, pointSchema } = require("../../infrastructure/database/model-utils");

const mediaMetadataSchema = new mongoose.Schema({
  key: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true, min: 1 },
  checksumSha256: { type: String, required: true },
  createdAt: { type: Date, required: true, default: Date.now },
}, { _id: true });

const listingSchema = new mongoose.Schema({
  authorId: objectId("User"),
  communityId: objectId("Community"),
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
  type: { type: String, enum: ["item", "skill"], required: true },
  category: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
  price: { type: Number, required: true, min: 0, max: 1_000_000 },
  location: { type: pointSchema, required: true },
  media: { type: [mediaMetadataSchema], validate: [(value) => value.length <= 5, "At most 5 media files"] },
  status: { type: String, enum: ["active", "reserved", "closed", "removed"], default: "active", required: true },
}, { timestamps: true });

listingSchema.index({ location: "2dsphere" }, { name: "geo_listings_location" });
listingSchema.index({ authorId: 1, createdAt: -1, _id: -1 }, { name: "ix_listings_author_time" });
listingSchema.index(
  { communityId: 1, status: 1, category: 1, createdAt: -1, _id: -1 },
  { name: "ix_listings_community_feed" },
);
listingSchema.index({ title: "text", description: "text" }, { name: "text_listings_search" });

module.exports = mongoose.models.Listing || mongoose.model("Listing", listingSchema);
