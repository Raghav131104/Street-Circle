const assert = require("node:assert/strict");
const { test } = require("node:test");
const { models } = require("../src/infrastructure/database/models");

function indexes(model) {
  return new Map(model.schema.indexes().map(([fields, options]) => [options.name, { fields, options }]));
}

test("users enforce normalized username and email uniqueness", () => {
  const defined = indexes(models.User);
  assert.equal(defined.get("uq_users_username_normalized").options.unique, true);
  assert.equal(defined.get("uq_users_email_normalized").options.unique, true);
  assert.equal(models.User.schema.path("passwordHash").options.select, false);
});

test("memberships enforce one user membership per community", () => {
  const index = indexes(models.Membership).get("uq_memberships_user_community");
  assert.deepEqual(index.fields, { userId: 1, communityId: 1 });
  assert.equal(index.options.unique, true);
});

test("listings define geospatial and feed query indexes", () => {
  const defined = indexes(models.Listing);
  assert.deepEqual(defined.get("geo_listings_location").fields, { location: "2dsphere" });
  assert.deepEqual(defined.get("ix_listings_community_feed").fields, {
    communityId: 1, status: 1, category: 1, createdAt: -1, _id: -1,
  });
});

test("requests enforce idempotency and only one accepted request per listing", () => {
  const defined = indexes(models.Request);
  assert.equal(defined.get("uq_requests_idempotency").options.unique, true);
  const accepted = defined.get("uq_requests_one_accepted");
  assert.equal(accepted.options.unique, true);
  assert.deepEqual(accepted.options.partialFilterExpression, { status: "ACCEPTED" });
});

test("sessions expire through a TTL index and hide their secret hash", () => {
  const ttl = indexes(models.Session).get("ttl_sessions_expiry");
  assert.equal(ttl.options.expireAfterSeconds, 0);
  assert.equal(models.Session.schema.path("secretHash").options.select, false);
});

test("notifications define user/read feed and deduplication indexes", () => {
  const defined = indexes(models.Notification);
  assert.deepEqual(defined.get("ix_notifications_user_read").fields, { userId: 1, readAt: 1, createdAt: -1, _id: -1 });
  assert.equal(defined.get("uq_notifications_dedup").options.unique, true);
});

test("GeoJSON coordinates require longitude then latitude ranges", async () => {
  const listing = new models.Listing({
    authorId: "507f1f77bcf86cd799439011",
    communityId: "507f191e810c19729de860ea",
    title: "Valid listing",
    description: "A sufficiently detailed description",
    type: "item",
    category: "tools",
    price: 0,
    location: { type: "Point", coordinates: [181, 20] },
  });
  await assert.rejects(() => listing.validate(), /longitude, latitude/);
});
