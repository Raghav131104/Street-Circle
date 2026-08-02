const assert = require("node:assert/strict");
const { test } = require("node:test");
const { decodeCursor, encodeCursor } = require("../src/modules/listings/listing.cursor");
const { assertActiveCommunityMember, assertCanManageListing } = require("../src/modules/listings/listing.policy");
const { createListingService } = require("../src/modules/listings/listing.service");

function id(value) { return { toString: () => value }; }

test("feed and distance cursors round-trip and malformed cursors fail stably", () => {
  const feed = { createdAt: "2026-08-01T00:00:00.000Z", id: "650000000000000000000020" };
  assert.deepEqual(decodeCursor(encodeCursor(feed), "feed"), feed);
  const near = { distanceMeters: 42.5, id: "650000000000000000000020" };
  assert.deepEqual(decodeCursor(encodeCursor(near), "near"), near);
  assert.throws(() => decodeCursor("not-a-cursor", "feed"), (error) => error.code === "INVALID_CURSOR");
});

test("listing creation requires active membership and server supplies author identity", async () => {
  const writes = [];
  const repository = {
    async findMembership() { return { status: "active", role: "member" }; },
    async create(data) {
      writes.push(data);
      return { ...data, _id: id("listing-1"), authorId: id(data.authorId), communityId: id(data.communityId) };
    },
  };
  const service = createListingService({ repository });
  const listing = await service.create("actor-1", {
    communityId: "community-1", title: "Power drill", description: "Available for a weekend project",
    type: "item", category: "Tools", price: 0, longitude: 72.8, latitude: 19.1,
  });
  assert.equal(writes[0].authorId, "actor-1");
  assert.deepEqual(writes[0].location.coordinates, [72.8, 19.1]);
  assert.equal(listing.authorId, "actor-1");
});

test("inactive and blocked users cannot create community listings", () => {
  assert.throws(() => assertActiveCommunityMember({ status: "pending" }), (error) => error.code === "ACTIVE_MEMBERSHIP_REQUIRED");
  assert.throws(() => assertActiveCommunityMember({ status: "blocked" }), (error) => error.status === 403);
});

test("author and active moderator can manage a listing but another member cannot", () => {
  const listing = { authorId: id("author-1") };
  assert.doesNotThrow(() => assertCanManageListing("author-1", listing, null));
  assert.doesNotThrow(() => assertCanManageListing("moderator-1", listing, { status: "active", role: "moderator" }));
  assert.throws(
    () => assertCanManageListing("member-1", listing, { status: "active", role: "member" }),
    (error) => error.code === "LISTING_FORBIDDEN" && error.status === 403,
  );
});

test("listing list is bounded and creates the correct next cursor", async () => {
  const records = [1, 2, 3].map((number) => ({
    _id: id(`65000000000000000000002${number}`), authorId: id("author-1"), communityId: id("community-1"),
    title: `Listing ${number}`, description: "A sufficiently long description", type: "item", category: "tools",
    price: 0, location: { type: "Point", coordinates: [72.8, 19.1] }, media: [], status: "active",
    createdAt: new Date(`2026-08-0${number}T00:00:00.000Z`), updatedAt: new Date(),
  }));
  const service = createListingService({ repository: { async list() { return records; } } });
  const result = await service.list({ limit: 2, status: "active" });
  assert.equal(result.listings.length, 2);
  assert.ok(result.nextCursor);
});
