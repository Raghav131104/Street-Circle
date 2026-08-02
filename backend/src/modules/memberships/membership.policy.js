const { AppError } = require("../../shared/errors/AppError");

function requireActiveModerator(actorMembership) {
  if (!actorMembership || actorMembership.status !== "active" || !["owner", "moderator"].includes(actorMembership.role)) {
    throw new AppError({ code: "MODERATOR_REQUIRED", message: "Moderator permission required", status: 403 });
  }
}

function assertCanReviewMembership(actorMembership, targetMembership) {
  requireActiveModerator(actorMembership);
  if (targetMembership.status !== "pending") {
    throw new AppError({ code: "MEMBERSHIP_STATE_CONFLICT", message: "Membership is not pending", status: 409 });
  }
  if (actorMembership.communityId.toString() !== targetMembership.communityId.toString()) {
    throw new AppError({ code: "MEMBERSHIP_SCOPE_MISMATCH", message: "Membership belongs to another community", status: 403 });
  }
}

function assertCanChangeRole(actorMembership, targetMembership, nextRole) {
  if (!actorMembership || actorMembership.status !== "active" || actorMembership.role !== "owner") {
    throw new AppError({ code: "OWNER_REQUIRED", message: "Community owner permission required", status: 403 });
  }
  if (targetMembership.status !== "active") {
    throw new AppError({ code: "MEMBERSHIP_STATE_CONFLICT", message: "Only active member roles can change", status: 409 });
  }
  if (targetMembership.role === "owner" || nextRole === "owner") {
    throw new AppError({ code: "OWNER_PROTECTED", message: "Community ownership cannot be changed by this operation", status: 409 });
  }
}

function assertCanLeave(membership) {
  if (!membership || membership.status !== "active") {
    throw new AppError({ code: "ACTIVE_MEMBERSHIP_REQUIRED", message: "Active membership required", status: 409 });
  }
  if (membership.role === "owner") {
    throw new AppError({ code: "OWNER_CANNOT_LEAVE", message: "Transfer or archive the community before leaving", status: 409 });
  }
}

module.exports = { assertCanChangeRole, assertCanLeave, assertCanReviewMembership, requireActiveModerator };
