const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  assertCanChangeRole, assertCanLeave, assertCanReviewMembership, requireActiveModerator,
} = require("../src/modules/memberships/membership.policy");
const { createCommunityService } = require("../src/modules/communities/community.service");

const communityId = { toString: () => "community-1" };

test("owner and moderator can review pending membership in their community", () => {
  const target = { status: "pending", communityId };
  assert.doesNotThrow(() => assertCanReviewMembership({ status: "active", role: "owner", communityId }, target));
  assert.doesNotThrow(() => assertCanReviewMembership({ status: "active", role: "moderator", communityId }, target));
});

test("ordinary member cannot perform moderator action", () => {
  assert.throws(
    () => requireActiveModerator({ status: "active", role: "member", communityId }),
    (error) => error.code === "MODERATOR_REQUIRED" && error.status === 403,
  );
});

test("moderator cannot change roles and owner role is protected", () => {
  const target = { status: "active", role: "member", communityId };
  assert.throws(
    () => assertCanChangeRole({ status: "active", role: "moderator", communityId }, target, "moderator"),
    (error) => error.code === "OWNER_REQUIRED",
  );
  assert.throws(
    () => assertCanChangeRole(
      { status: "active", role: "owner", communityId },
      { status: "active", role: "owner", communityId }, "member",
    ),
    (error) => error.code === "OWNER_PROTECTED",
  );
});

test("owner cannot leave while an active member can", () => {
  assert.throws(
    () => assertCanLeave({ status: "active", role: "owner" }),
    (error) => error.code === "OWNER_CANNOT_LEAVE" && error.status === 409,
  );
  assert.doesNotThrow(() => assertCanLeave({ status: "active", role: "member" }));
});

test("review rejects stale and cross-community targets", () => {
  const actor = { status: "active", role: "moderator", communityId };
  assert.throws(
    () => assertCanReviewMembership(actor, { status: "active", communityId }),
    (error) => error.code === "MEMBERSHIP_STATE_CONFLICT",
  );
  assert.throws(
    () => assertCanReviewMembership(actor, { status: "pending", communityId: { toString: () => "community-2" } }),
    (error) => error.code === "MEMBERSHIP_SCOPE_MISMATCH",
  );
});

test("only an active owner or moderator can list the pending review queue", async () => {
  const records = [{
    _id: { toString: () => "membership-1" },
    userId: { toString: () => "user-1" },
    communityId: { toString: () => "community-1" },
    role: "member", status: "pending", joinedAt: null, createdAt: new Date(),
  }];
  const repository = {
    async findMembership(actorId) { return { status: "active", role: actorId === "owner" ? "owner" : "member" }; },
    async listMemberships() { return records; },
  };
  const service = createCommunityService({ repository });
  assert.equal((await service.listMemberships("owner", "community-1", { status: "pending", limit: 20 })).length, 1);
  await assert.rejects(service.listMemberships("member", "community-1", { status: "pending", limit: 20 }), (error) => error.code === "MODERATOR_REQUIRED");
});
