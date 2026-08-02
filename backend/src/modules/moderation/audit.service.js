const AuditEvent = require("./audit-event.model");

function createAuditService({ model = AuditEvent, logger } = {}) {
  return {
    async record({ actorId, action, entityType, entityId, requestId, metadata = {} }) {
      try {
        return await model.create({ actorId, action, entityType, entityId, requestId, metadata });
      } catch (error) {
        logger?.error({ err: error, action, entityType, requestId }, "Audit event persistence failed");
        return null;
      }
    },
  };
}

module.exports = { createAuditService };
