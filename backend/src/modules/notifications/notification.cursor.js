const { AppError } = require("../../shared/errors/AppError");

function encodeNotificationCursor(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeNotificationCursor(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!/^\d{4}-\d{2}-\d{2}T/.test(parsed.createdAt) || !/^[a-fA-F0-9]{24}$/.test(parsed.id)) throw new Error("shape");
    return parsed;
  } catch (error) {
    throw new AppError({ code: "INVALID_NOTIFICATION_CURSOR", message: "Notification cursor is invalid", status: 400, cause: error });
  }
}

module.exports = { decodeNotificationCursor, encodeNotificationCursor };
