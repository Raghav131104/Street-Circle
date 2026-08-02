const mongoose = require("mongoose");
const Listing = require("./listing.model");
const Membership = require("../memberships/membership.model");

function escapedRegex(value) {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

const listingRepository = {
  findMembership(userId, communityId) { return Membership.findOne({ userId, communityId }); },
  create(data) { return Listing.create(data); },
  findById(id) { return Listing.findById(id); },
  update(id, changes) { return Listing.findByIdAndUpdate(id, { $set: changes }, { returnDocument: "after", runValidators: true }); },
  remove(id) { return Listing.findByIdAndUpdate(id, { $set: { status: "removed" } }, { returnDocument: "after" }); },
  appendMedia(id, media) {
    return Listing.findOneAndUpdate(
      {
        _id: id,
        status: { $ne: "removed" },
        $expr: { $lte: [{ $size: { $ifNull: ["$media", []] } }, 5 - media.length] },
      },
      { $push: { media: { $each: media } } },
      { returnDocument: "after", runValidators: true },
    );
  },
  removeMedia(id, mediaId) {
    return Listing.findOneAndUpdate(
      { _id: id, "media._id": mediaId, status: { $ne: "removed" } },
      { $pull: { media: { _id: mediaId } } },
      { returnDocument: "after" },
    );
  },
  async list(filters, cursor, limit) {
    const query = { status: filters.status };
    if (filters.communityId) query.communityId = new mongoose.Types.ObjectId(filters.communityId);
    if (filters.type) query.type = filters.type;
    if (filters.category) query.category = filters.category.toLowerCase();
    if (filters.search) {
      const pattern = escapedRegex(filters.search);
      query.$or = [{ title: pattern }, { description: pattern }];
    }

    if (filters.longitude !== undefined) {
      const pipeline = [{ $geoNear: {
        near: { type: "Point", coordinates: [filters.longitude, filters.latitude] },
        distanceField: "distanceMeters", spherical: true, maxDistance: filters.radiusMeters, query,
      } }];
      if (cursor) pipeline.push({ $match: { $or: [
        { distanceMeters: { $gt: cursor.distanceMeters } },
        { distanceMeters: cursor.distanceMeters, _id: { $gt: new mongoose.Types.ObjectId(cursor.id) } },
      ] } });
      pipeline.push({ $sort: { distanceMeters: 1, _id: 1 } }, { $limit: limit + 1 });
      return Listing.aggregate(pipeline);
    }

    if (cursor) query.$and = [{ $or: [
      { createdAt: { $lt: new Date(cursor.createdAt) } },
      { createdAt: new Date(cursor.createdAt), _id: { $lt: new mongoose.Types.ObjectId(cursor.id) } },
    ] }];
    return Listing.find(query).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
  },
};

module.exports = { listingRepository };
