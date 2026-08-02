const mongoose = require("mongoose");
const { objectId } = require("../../infrastructure/database/model-utils");

const statusHistorySchema = new mongoose.Schema({
  from: { type: String, default: null },
  to: { type: String, required: true },
  actorId: objectId("User", false),
  operationKey: { type: String, maxlength: 100 },
  at: { type: Date, required: true, default: Date.now },
}, { _id: false });

const requestSchema = new mongoose.Schema({
  listingId: objectId("Listing"),
  requesterId: objectId("User"),
  ownerId: objectId("User"),
  message: { type: String, trim: true, maxlength: 1000 },
  status: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "COMPLETED", "REJECTED", "CANCELLED", "EXPIRED"],
    default: "PENDING",
    required: true,
  },
  idempotencyKey: { type: String, required: true, maxlength: 100 },
  statusHistory: { type: [statusHistorySchema], validate: [(value) => value.length <= 20, "Status history is bounded"] },
  acceptedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  expiredAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

requestSchema.index({ requesterId: 1, status: 1, createdAt: -1, _id: -1 }, { name: "ix_requests_requester" });
requestSchema.index({ ownerId: 1, status: 1, createdAt: -1, _id: -1 }, { name: "ix_requests_owner" });
requestSchema.index({ requesterId: 1, idempotencyKey: 1 }, { unique: true, name: "uq_requests_idempotency" });
requestSchema.index(
  { listingId: 1, requesterId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["PENDING", "ACCEPTED"] } }, name: "uq_requests_active_pair" },
);
requestSchema.index(
  { listingId: 1 },
  { unique: true, partialFilterExpression: { status: "ACCEPTED" }, name: "uq_requests_one_accepted" },
);

module.exports = mongoose.models.Request || mongoose.model("Request", requestSchema);
