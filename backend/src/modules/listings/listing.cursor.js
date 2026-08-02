const { AppError } = require("../../shared/errors/AppError");

function encodeCursor(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCursor(cursor, mode) {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (mode === "near") {
      if (!Number.isFinite(value.distanceMeters) || !/^[a-fA-F0-9]{24}$/.test(value.id)) throw new Error();
    } else if (!Number.isFinite(Date.parse(value.createdAt)) || !/^[a-fA-F0-9]{24}$/.test(value.id)) throw new Error();
    return value;
  } catch {
    throw new AppError({ code: "INVALID_CURSOR", message: "Pagination cursor is invalid", status: 400 });
  }
}

module.exports = { decodeCursor, encodeCursor };
