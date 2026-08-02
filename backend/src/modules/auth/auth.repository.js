const User = require("../users/user.model");
const Session = require("./session.model");
const AuditEvent = require("../moderation/audit-event.model");

const authRepository = {
  createUser(data) { return User.create(data); },
  findUserForLogin(identifierNormalized) {
    return User.findOne({
      $or: [{ usernameNormalized: identifierNormalized }, { emailNormalized: identifierNormalized }],
      status: "active",
    }).select("+passwordHash +usernameNormalized +emailNormalized");
  },
  findUserById(id) { return User.findById(id); },
  createSession(data) { return Session.create(data); },
  findActiveSession(secretHash, now) {
    return Session.findOne({ secretHash, revokedAt: null, expiresAt: { $gt: now } }).select("+secretHash");
  },
  revokeSession(id, now) { return Session.updateOne({ _id: id, revokedAt: null }, { $set: { revokedAt: now } }); },
  recordAudit(data) { return AuditEvent.create(data); },
};

module.exports = { authRepository };
