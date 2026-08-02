const { AppError } = require("../../shared/errors/AppError");

function assertActiveCommunityMember(membership) {
  if (!membership || membership.status !== "active") {
    throw new AppError({ code: "ACTIVE_MEMBERSHIP_REQUIRED", message: "Active community membership required", status: 403 });
  }
}

function assertCanManageListing(actorId, listing, membership) {
  if (listing.authorId.toString() === actorId) return;
  if (membership?.status === "active" && ["owner", "moderator"].includes(membership.role)) return;
  throw new AppError({ code: "LISTING_FORBIDDEN", message: "You cannot modify this listing", status: 403 });
}

module.exports = { assertActiveCommunityMember, assertCanManageListing };
