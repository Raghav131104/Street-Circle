const mongoose = require("mongoose");
const Notification = require("./notification.model");

const notificationRepository = {
  create(data) { return Notification.create(data); },
  upsertDeduplicated(data) {
    return Notification.findOneAndUpdate(
      { userId: data.userId, deduplicationKey: data.deduplicationKey },
      { $setOnInsert: data },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  },
  list(userId, cursor, limit) {
    const query = { userId };
    if (cursor) query.$or = [
      { createdAt: { $lt: new Date(cursor.createdAt) } },
      { createdAt: new Date(cursor.createdAt), _id: { $lt: new mongoose.Types.ObjectId(cursor.id) } },
    ];
    return Notification.find(query).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
  },
  countUnread(userId) { return Notification.countDocuments({ userId, readAt: null }); },
  markOne(userId, id, now) {
    return Notification.findOneAndUpdate(
      { _id: id, userId, readAt: null },
      { $set: { readAt: now } },
      { returnDocument: "after" },
    );
  },
  findForUser(userId, id) { return Notification.findOne({ _id: id, userId }); },
  markAll(userId, now) { return Notification.updateMany({ userId, readAt: null }, { $set: { readAt: now } }); },
};

module.exports = { notificationRepository };
