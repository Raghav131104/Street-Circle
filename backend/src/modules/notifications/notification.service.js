const { AppError } = require("../../shared/errors/AppError");
const { decodeNotificationCursor, encodeNotificationCursor } = require("./notification.cursor");
const { notificationRepository } = require("./notification.repository");

function notificationDto(notification) {
  return {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    body: notification.body,
    entityType: notification.entityType || null,
    entityId: notification.entityId?.toString() || null,
    readAt: notification.readAt || null,
    createdAt: notification.createdAt,
  };
}

function createNotificationService({ repository = notificationRepository, now = () => new Date() } = {}) {
  return {
    async create(input) {
      const record = input.deduplicationKey
        ? await repository.upsertDeduplicated(input)
        : await repository.create(input);
      return notificationDto(record);
    },
    async list(userId, input) {
      const records = await repository.list(userId, decodeNotificationCursor(input.cursor), input.limit);
      const hasMore = records.length > input.limit;
      const page = records.slice(0, input.limit);
      const last = page.at(-1);
      return {
        notifications: page.map(notificationDto),
        nextCursor: hasMore && last ? encodeNotificationCursor({ createdAt: last.createdAt.toISOString(), id: last._id.toString() }) : null,
      };
    },
    async unreadCount(userId) { return repository.countUnread(userId); },
    async markOne(userId, id) {
      const updated = await repository.markOne(userId, id, now());
      if (updated) return notificationDto(updated);
      const existing = await repository.findForUser(userId, id);
      if (!existing) throw new AppError({ code: "NOTIFICATION_NOT_FOUND", message: "Notification not found", status: 404 });
      return notificationDto(existing);
    },
    async markAll(userId) {
      const result = await repository.markAll(userId, now());
      return { updatedCount: result.modifiedCount || 0 };
    },
  };
}

module.exports = { createNotificationService, notificationDto };
