const path = require("node:path");
const fs = require("node:fs/promises");
const assert = require("node:assert/strict");
const dotenv = require(path.join(__dirname, "..", "backend", "node_modules", "dotenv"));
const mongoose = require(path.join(__dirname, "..", "backend", "node_modules", "mongoose"));
const { loadEnv } = require("../backend/src/config/env");
const { createLogger } = require("../backend/src/shared/logging/logger");
const { createApp } = require("../backend/src/app");
const { models, syncIndexes } = require("../backend/src/infrastructure/database/models");

dotenv.config({ path: path.join(__dirname, "..", "backend", ".env"), quiet: true });
const marker = "listing_verifier_20260802";
let mediaRoot;

async function connect(uri) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 20_000, connectTimeoutMS: 20_000, family: 4 });
      return;
    } catch (error) {
      lastError = error;
      await mongoose.disconnect().catch(() => {});
      if (attempt < 3) {
        console.warn(`Atlas test connection attempt ${attempt}/3 failed; retrying safely.`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
  }
  throw lastError;
}

async function cleanup() {
  const users = await models.User.find({ emailNormalized: { $regex: `^${marker}` } }).select("_id");
  const userIds = users.map((record) => record._id);
  const communities = await models.Community.find({ name: marker }).select("_id");
  const communityIds = communities.map((record) => record._id);
  const listings = await models.Listing.find({ communityId: { $in: communityIds } }).select("media.key").lean();
  if (mediaRoot) {
    await Promise.allSettled(listings.flatMap((listing) => listing.media || []).map((media) => fs.unlink(path.join(mediaRoot, media.key))));
  }
  await models.Listing.deleteMany({ communityId: { $in: communityIds } });
  await models.Membership.deleteMany({ $or: [{ userId: { $in: userIds } }, { communityId: { $in: communityIds } }] });
  await models.Community.deleteMany({ _id: { $in: communityIds } });
  await models.Session.deleteMany({ userId: { $in: userIds } });
  await models.AuditEvent.deleteMany({ actorId: { $in: userIds } });
  await models.User.deleteMany({ _id: { $in: userIds } });
}

async function api(baseUrl, pathname, { cookie, method = "GET", body } = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { "content-type": "application/json", origin: "http://localhost:5173", ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function register(baseUrl, suffix) {
  const response = await api(baseUrl, "/api/v1/auth/register", { method: "POST", body: {
    username: `${marker}_${suffix}`, email: `${marker}_${suffix}@streetcircle.test`, password: "ListingVerifier!2026",
  } });
  assert.equal(response.status, 201);
  return { cookie: response.headers.get("set-cookie").split(";", 1)[0], user: (await response.json()).user };
}

async function main() {
  const config = loadEnv({ ...process.env, NODE_ENV: "test", LOG_LEVEL: "silent" });
  mediaRoot = config.mediaRoot;
  assert.equal(new URL(config.databaseUri).pathname.slice(1), "streetcircle_test");
  await connect(config.databaseUri);
  await syncIndexes();
  await cleanup();
  const app = createApp({ config, logger: createLogger({ level: "silent" }), readiness: {
    databaseName: "streetcircle_test", isDatabaseReady: async () => true,
  } });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const owner = await register(baseUrl, "owner");
    const outsider = await register(baseUrl, "outsider");
    const communityResponse = await api(baseUrl, "/api/v1/communities", { cookie: owner.cookie, method: "POST", body: {
      name: marker, description: "A deterministic listing integration community.", longitude: 72.8777,
      latitude: 19.076, coverageRadiusMeters: 5000, visibility: "public", joinPolicy: "approval", rules: [],
    } });
    assert.equal(communityResponse.status, 201);
    const community = (await communityResponse.json()).community;
    const input = {
      communityId: community.id, title: "Integration drill", description: "A drill used for integration verification.",
      type: "item", category: "tools", price: 0, longitude: 72.8777, latitude: 19.076,
    };
    assert.equal((await api(baseUrl, "/api/v1/listings", { method: "POST", body: input })).status, 401);
    assert.equal((await api(baseUrl, "/api/v1/listings", { cookie: outsider.cookie, method: "POST", body: input })).status, 403);

    const firstResponse = await api(baseUrl, "/api/v1/listings", { cookie: owner.cookie, method: "POST", body: input });
    assert.equal(firstResponse.status, 201);
    const first = (await firstResponse.json()).listing;
    assert.equal(first.authorId, owner.user.id);

    const outsiderUpload = new FormData();
    outsiderUpload.append("files", new Blob([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1])]), "attempt.png");
    assert.equal((await fetch(`${baseUrl}/api/v1/listings/${first.id}/media`, {
      method: "POST", headers: { origin: "http://localhost:5173", cookie: outsider.cookie }, body: outsiderUpload,
    })).status, 403);

    const invalidUpload = new FormData();
    invalidUpload.append("files", new Blob(["<script>not-an-image</script>"], { type: "image/png" }), "fake.png");
    assert.equal((await fetch(`${baseUrl}/api/v1/listings/${first.id}/media`, {
      method: "POST", headers: { origin: "http://localhost:5173", cookie: owner.cookie }, body: invalidUpload,
    })).status, 415);

    const pngBytes = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from("atlas-media-check")]);
    const validUpload = new FormData();
    validUpload.append("files", new Blob([pngBytes], { type: "application/octet-stream" }), "ignored-name.exe");
    const uploadResponse = await fetch(`${baseUrl}/api/v1/listings/${first.id}/media`, {
      method: "POST", headers: { origin: "http://localhost:5173", cookie: owner.cookie }, body: validUpload,
    });
    assert.equal(uploadResponse.status, 201);
    const uploadedListing = (await uploadResponse.json()).listing;
    assert.equal(uploadedListing.media.length, 1);
    assert.equal(uploadedListing.media[0].mimeType, "image/png");
    const mediaResponse = await fetch(`${baseUrl}${uploadedListing.media[0].url}`);
    assert.equal(mediaResponse.status, 200);
    assert.equal(mediaResponse.headers.get("content-type"), "image/png");
    assert.equal(Buffer.from(await mediaResponse.arrayBuffer()).equals(pngBytes), true);
    const secondResponse = await api(baseUrl, "/api/v1/listings", { cookie: owner.cookie, method: "POST", body: {
      ...input, title: "Integration ladder", description: "A ladder used for cursor pagination verification.",
    } });
    assert.equal(secondResponse.status, 201);

    const nearby = await api(baseUrl, `/api/v1/listings?longitude=72.8777&latitude=19.076&radiusMeters=1000&communityId=${community.id}&limit=1`);
    assert.equal(nearby.status, 200);
    const pageOne = await nearby.json();
    assert.equal(pageOne.listings.length, 1);
    assert.ok(pageOne.nextCursor);
    assert.ok(pageOne.listings[0].distanceMeters < 1);
    const pageTwo = await api(baseUrl, `/api/v1/listings?longitude=72.8777&latitude=19.076&radiusMeters=1000&communityId=${community.id}&limit=1&cursor=${encodeURIComponent(pageOne.nextCursor)}`);
    assert.equal((await pageTwo.json()).listings.length, 1);

    assert.equal((await api(baseUrl, `/api/v1/listings/${first.id}`, { cookie: outsider.cookie, method: "DELETE" })).status, 403);
    const updated = await api(baseUrl, `/api/v1/listings/${first.id}`, {
      cookie: owner.cookie, method: "PATCH", body: { title: "Updated integration drill" },
    });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).listing.title, "Updated integration drill");
    assert.equal((await api(baseUrl, `/api/v1/listings/${first.id}`, { cookie: owner.cookie, method: "DELETE" })).status, 204);
    assert.equal((await api(baseUrl, `/api/v1/listings/${first.id}`)).status, 404);
    assert.equal((await fetch(`${baseUrl}${uploadedListing.media[0].url}`)).status, 404);
    console.log("Atlas listing/media integration passed: auth, membership, identity, geo, cursor, ownership, signatures, read, cleanup, update, delete.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await cleanup();
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error(`Atlas listing integration failed: ${error.name}: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
