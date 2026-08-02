const crypto = require("node:crypto");
const { AppError } = require("../../shared/errors/AppError");
const { communityRepository } = require("./community.repository");
const { assertCanChangeRole, assertCanLeave, assertCanReviewMembership, requireActiveModerator } = require("../memberships/membership.policy");

function communityDto(community) {
  return {
    id: community._id.toString(), name: community.name, slug: community.slug,
    description: community.description, center: community.center,
    coverageRadiusMeters: community.coverageRadiusMeters, visibility: community.visibility,
    joinPolicy: community.joinPolicy, rules: community.rules, ownerId: community.ownerId.toString(),
    createdAt: community.createdAt,
  };
}

function membershipDto(membership) {
  return {
    id: membership._id.toString(), userId: membership.userId.toString(),
    communityId: membership.communityId.toString(), role: membership.role,
    status: membership.status, joinedAt: membership.joinedAt, createdAt: membership.createdAt,
  };
}

function defaultSlug(name) {
  const base = name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 70) || "community";
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

function createCommunityService({
  repository = communityRepository, notificationService = null, auditService = null,
  slugger = defaultSlug, now = () => new Date(),
} = {}) {
  return {
    async create(actorId, input, context = {}) {
      const community = await repository.createWithOwner({
        name: input.name, slug: slugger(input.name), description: input.description,
        center: { type: "Point", coordinates: [input.longitude, input.latitude] },
        coverageRadiusMeters: input.coverageRadiusMeters, ownerId: actorId,
        visibility: input.visibility, joinPolicy: input.joinPolicy, rules: input.rules, status: "active",
      }, actorId);
      await auditService?.record({
        actorId, action: "community.create", entityType: "community", entityId: community._id,
        requestId: context.requestId,
      });
      return communityDto(community);
    },
    async get(id) {
      const community = await repository.findById(id);
      if (!community) throw new AppError({ code: "COMMUNITY_NOT_FOUND", message: "Community not found", status: 404 });
      return communityDto(community);
    },
    async list() { return (await repository.listAvailable()).map(communityDto); },
    async listMine(actorId) {
      return (await repository.listUserMemberships(actorId)).map((membership) => ({
        ...membershipDto(membership),
        community: membership.communityId?.name ? communityDto(membership.communityId) : null,
        communityId: membership.communityId?._id?.toString() || membership.communityId.toString(),
      }));
    },
    async listMemberships(actorId, communityId, input) {
      requireActiveModerator(await repository.findMembership(actorId, communityId));
      return (await repository.listMemberships(communityId, input.status, input.limit)).map(membershipDto);
    },
    async requestMembership(actorId, communityId, context = {}) {
      const community = await repository.findById(communityId);
      if (!community) throw new AppError({ code: "COMMUNITY_NOT_FOUND", message: "Community not found", status: 404 });
      const existing = await repository.findMembership(actorId, communityId);
      if (existing?.status === "blocked") throw new AppError({ code: "MEMBERSHIP_BLOCKED", message: "Membership is blocked", status: 403 });
      if (existing && ["active", "pending"].includes(existing.status)) {
        throw new AppError({ code: "MEMBERSHIP_ALREADY_EXISTS", message: "Membership already exists", status: 409 });
      }
      const status = community.joinPolicy === "open" ? "active" : "pending";
      const joinedAt = status === "active" ? now() : null;
      const membership = existing
        ? await repository.reactivateMembership(existing._id, status, joinedAt)
        : await repository.createMembership({ userId: actorId, communityId, role: "member", status, joinedAt });
      if (notificationService && status === "pending") {
        const moderators = await repository.listModerators(communityId);
        await Promise.all(moderators.map((moderator) => notificationService.create({
          userId: moderator.userId,
          type: "membership.requested",
          title: "New membership request",
          body: "A neighbor requested to join a community you moderate.",
          entityType: "membership",
          entityId: membership._id,
          deduplicationKey: `membership:${membership._id}:requested:${moderator.userId}`,
        })));
      }
      await auditService?.record({
        actorId, action: "membership.request", entityType: "membership", entityId: membership._id,
        requestId: context.requestId, metadata: { communityId, status },
      });
      return membershipDto(membership);
    },
    async decide(actorId, communityId, membershipId, input, context = {}) {
      const actor = await repository.findMembership(actorId, communityId);
      const target = await repository.findMembershipById(membershipId);
      if (!target || target.communityId.toString() !== communityId) {
        throw new AppError({ code: "MEMBERSHIP_NOT_FOUND", message: "Membership not found", status: 404 });
      }
      let updated;
      if (["approve", "reject"].includes(input.action)) {
        assertCanReviewMembership(actor, target);
        updated = await repository.decideMembership(target._id, "pending", {
          status: input.action === "approve" ? "active" : "rejected",
          joinedAt: input.action === "approve" ? now() : null,
          decidedAt: now(), decidedBy: actorId,
        });
      } else if (input.action === "change_role") {
        assertCanChangeRole(actor, target, input.role);
        updated = await repository.changeRole(target._id, input.role);
      } else {
        requireActiveModerator(actor);
        if (target.role === "owner") throw new AppError({ code: "OWNER_PROTECTED", message: "Owner cannot be blocked", status: 409 });
        updated = await repository.decideMembership(target._id, target.status, { status: "blocked", decidedAt: now(), decidedBy: actorId });
      }
      if (!updated) throw new AppError({ code: "MEMBERSHIP_STATE_CONFLICT", message: "Membership changed concurrently", status: 409 });
      if (notificationService) {
        const action = input.action === "change_role" ? `role-${input.role}` : input.action;
        await notificationService.create({
          userId: updated.userId,
          type: `membership.${action}`,
          title: "Membership updated",
          body: `Your community membership was ${action.replace("-", " ")}.`,
          entityType: "membership",
          entityId: updated._id,
          deduplicationKey: `membership:${updated._id}:${action}`,
        });
      }
      await auditService?.record({
        actorId, action: `membership.${input.action}`, entityType: "membership", entityId: updated._id,
        requestId: context.requestId, metadata: { communityId, resultingStatus: updated.status, resultingRole: updated.role },
      });
      return membershipDto(updated);
    },
    async leave(actorId, communityId, context = {}) {
      const membership = await repository.findMembership(actorId, communityId);
      assertCanLeave(membership);
      const updated = await repository.leave(membership._id);
      if (!updated) throw new AppError({ code: "MEMBERSHIP_STATE_CONFLICT", message: "Membership changed concurrently", status: 409 });
      await auditService?.record({
        actorId, action: "membership.leave", entityType: "membership", entityId: updated._id,
        requestId: context.requestId, metadata: { communityId },
      });
      return membershipDto(updated);
    },
  };
}

module.exports = { communityDto, createCommunityService, membershipDto };
