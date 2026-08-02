const mongoose = require("mongoose");
const { objectId } = require("../../infrastructure/database/model-utils");

const notificationSchema = new mongoose.Schema({
  userId: objectId("User"),
  type: { type: String, required: true, maxlength: 80 },
  title: { type: String, required: true, maxlength: 140 },
  body: { type: String, required: true, maxlength: 500 },
  entityType: { type: String, maxlength: 80 },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  deduplicationKey: { type: String, maxlength: 160 },
  readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1, _id: -1 }, { name: "ix_notifications_user_read" });
notificationSchema.index(
  { userId: 1, deduplicationKey: 1 },
  { unique: true, partialFilterExpression: { deduplicationKey: { $type: "string" } }, name: "uq_notifications_dedup" },
);

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
