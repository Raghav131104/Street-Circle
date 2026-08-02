const mongoose = require("mongoose");
const { AppError } = require("../../shared/errors/AppError");
const Listing = require("../listings/listing.model");
const Membership = require("../memberships/membership.model");
const Request = require("./request.model");

function transitionChanges(source, target, actorId, operationKey, now) {
  const timestampField = {
    ACCEPTED: "acceptedAt",
    COMPLETED: "completedAt",
    REJECTED: "rejectedAt",
    CANCELLED: "cancelledAt",
    EXPIRED: "expiredAt",
  }[target];
  return {
    $set: { status: target, ...(timestampField ? { [timestampField]: now } : {}) },
    $push: { statusHistory: { from: source, to: target, ...(actorId ? { actorId } : {}), operationKey, at: now } },
  };
}

const requestRepository = {
  findListing(id) { return Listing.findById(id); },
  findMembership(userId, communityId) { return Membership.findOne({ userId, communityId }); },
  findById(id) { return Request.findById(id); },
  findIdempotent(requesterId, idempotencyKey) { return Request.findOne({ requesterId, idempotencyKey }); },
  create(data) { return Request.create(data); },

  async transition({ requestId, actorId, source, target, operationKey, now, listingTransition }) {
    const session = await mongoose.startSession();
    let updated = null;
    try {
      await session.withTransaction(async () => {
        updated = await Request.findOneAndUpdate(
          {
            _id: requestId,
            status: source,
            ...(actorId ? { $or: [{ requesterId: actorId }, { ownerId: actorId }] } : {}),
          },
          transitionChanges(source, target, actorId, operationKey, now),
          { returnDocument: "after", runValidators: true, session },
        );
        if (!updated) return;
        if (listingTransition) {
          const listing = await Listing.findOneAndUpdate(
            { _id: updated.listingId, status: listingTransition.from },
            { $set: { status: listingTransition.to } },
            { returnDocument: "after", session },
          );
          if (!listing) {
            throw new AppError({ code: "REQUEST_SLOT_CONFLICT", message: "Listing availability changed", status: 409 });
          }
        }
      });
      return updated;
    } finally {
      await session.endSession();
    }
  },

  async expireDue(now, limit = 100) {
    const due = await Request.find({ status: "PENDING", expiresAt: { $lte: now } }).select("_id").limit(limit).lean();
    const results = await Promise.all(due.map((record) => Request.findOneAndUpdate(
      { _id: record._id, status: "PENDING", expiresAt: { $lte: now } },
      transitionChanges("PENDING", "EXPIRED", null, `system-expiry:${record._id}`, now),
      { returnDocument: "after" },
    )));
    return results.filter(Boolean);
  },

  list(actorId, input, cursor) {
    const participantField = input.role === "owner" ? "ownerId" : "requesterId";
    const query = { [participantField]: actorId, ...(input.status ? { status: input.status } : {}) };
    if (cursor) query.$or = [
      { createdAt: { $lt: new Date(cursor.createdAt) } },
      { createdAt: new Date(cursor.createdAt), _id: { $lt: new mongoose.Types.ObjectId(cursor.id) } },
    ];
    return Request.find(query).sort({ createdAt: -1, _id: -1 }).limit(input.limit + 1).lean();
  },
};

module.exports = { requestRepository, transitionChanges };
