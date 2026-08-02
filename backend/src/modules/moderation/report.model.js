const mongoose = require("mongoose");
const { objectId } = require("../../infrastructure/database/model-utils");

const reportSchema = new mongoose.Schema({
  reporterId: objectId("User"),
  communityId: objectId("Community"),
  subjectType: { type: String, enum: ["user", "listing", "request"], required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ["open", "reviewing", "resolved", "dismissed"], default: "open", required: true },
  resolvedBy: objectId("User", false),
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

reportSchema.index({ communityId: 1, status: 1, createdAt: -1, _id: -1 }, { name: "ix_reports_moderation_queue" });

module.exports = mongoose.models.Report || mongoose.model("Report", reportSchema);
