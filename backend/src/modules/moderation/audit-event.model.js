const mongoose = require("mongoose");
const { objectId } = require("../../infrastructure/database/model-utils");

const auditEventSchema = new mongoose.Schema({
  actorId: objectId("User", false),
  action: { type: String, required: true, maxlength: 100 },
  entityType: { type: String, required: true, maxlength: 80 },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  requestId: { type: String, maxlength: 100 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false }, minimize: false });

auditEventSchema.index({ actorId: 1, createdAt: -1, _id: -1 }, { name: "ix_audit_actor_time" });
auditEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 }, { name: "ix_audit_entity_time" });

module.exports = mongoose.models.AuditEvent || mongoose.model("AuditEvent", auditEventSchema);
