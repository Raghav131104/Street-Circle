const assert = require("node:assert/strict");
const path = require("node:path");
const dotenv = require(path.join(__dirname, "..", "backend", "node_modules", "dotenv"));
const mongoose = require(path.join(__dirname, "..", "backend", "node_modules", "mongoose"));
const { loadEnv } = require("../backend/src/config/env");
const { createLogger } = require("../backend/src/shared/logging/logger");
const { createApp } = require("../backend/src/app");
const { createRequestService } = require("../backend/src/modules/requests/request.service");
const { models, syncIndexes } = require("../backend/src/infrastructure/database/models");

dotenv.config({ path: path.join(__dirname, "..", "backend", ".env"), quiet: true });
const marker = "request_verifier_20260802";

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
        console.warn(`Atlas request test connection attempt ${attempt}/3 failed; retrying safely.`);
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
  const listings = await models.Listing.find({ communityId: { $in: communityIds } }).select("_id");
  const listingIds = listings.map((record) => record._id);
  await models.Notification.deleteMany({ userId: { $in: userIds } });
  await models.Request.deleteMany({ $or: [{ requesterId: { $in: userIds } }, { listingId: { $in: listingIds } }] });
  await models.Listing.deleteMany({ _id: { $in: listingIds } });
  await models.Membership.deleteMany({ $or: [{ userId: { $in: userIds } }, { communityId: { $in: communityIds } }] });
  await models.Community.deleteMany({ _id: { $in: communityIds } });
  await models.Session.deleteMany({ userId: { $in: userIds } });
  await models.AuditEvent.deleteMany({ actorId: { $in: userIds } });
  await models.User.deleteMany({ _id: { $in: userIds } });
}

async function api(baseUrl, pathname, { cookie, method = "GET", body, key } = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      origin: "http://localhost:5173",
      ...(cookie ? { cookie } : {}),
      ...(key ? { "idempotency-key": key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function register(baseUrl, suffix) {
  const response = await api(baseUrl, "/api/v1/auth/register", { method: "POST", body: {
    username: `${marker}_${suffix}`, email: `${marker}_${suffix}@streetcircle.test`, password: "RequestVerifier!2026",
  } });
  assert.equal(response.status, 201);
  return { cookie: response.headers.get("set-cookie").split(";", 1)[0], user: (await response.json()).user };
}

async function createRequest(baseUrl, actor, listingId, key) {
  const response = await api(baseUrl, "/api/v1/requests", {
    cookie: actor.cookie, method: "POST", key, body: { listingId, message: `Request created with ${key}` },
  });
  assert.equal(response.status, 201);
  return (await response.json()).request;
}

async function main() {
  const config = loadEnv({ ...process.env, NODE_ENV: "test", LOG_LEVEL: "silent" });
  assert.equal(new URL(config.databaseUri).pathname.slice(1), "streetcircle_test");
  await connect(config.databaseUri);
  await syncIndexes();
  await cleanup();
  const requestService = createRequestService();
  const app = createApp({ config, logger: createLogger({ level: "silent" }), services: { request: requestService }, readiness: {
    databaseName: "streetcircle_test", isDatabaseReady: async () => true,
  } });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const owner = await register(baseUrl, "owner");
    const requesterA = await register(baseUrl, "requester_a");
    const requesterB = await register(baseUrl, "requester_b");
    const communityResponse = await api(baseUrl, "/api/v1/communities", { cookie: owner.cookie, method: "POST", body: {
      name: marker, description: "Request workflow concurrency verification.", longitude: 72.8777,
      latitude: 19.076, coverageRadiusMeters: 5000, visibility: "public", joinPolicy: "approval", rules: [],
    } });
    assert.equal(communityResponse.status, 201);
    const community = (await communityResponse.json()).community;

    for (const requester of [requesterA, requesterB]) {
      const joinResponse = await api(baseUrl, `/api/v1/communities/${community.id}/memberships`, { cookie: requester.cookie, method: "POST" });
      const membership = (await joinResponse.json()).membership;
      assert.equal((await api(baseUrl, `/api/v1/communities/${community.id}/memberships/${membership.id}`, {
        cookie: owner.cookie, method: "PATCH", body: { action: "approve" },
      })).status, 200);
    }

    const listingInput = {
      communityId: community.id, title: "Exclusive integration drill", description: "A listing used to race two accept operations.",
      type: "item", category: "tools", price: 0, longitude: 72.8777, latitude: 19.076,
    };
    const listingResponse = await api(baseUrl, "/api/v1/listings", { cookie: owner.cookie, method: "POST", body: listingInput });
    const listing = (await listingResponse.json()).listing;
    const requestA = await createRequest(baseUrl, requesterA, listing.id, "create-request-a");
    const requestB = await createRequest(baseUrl, requesterB, listing.id, "create-request-b");

    const replay = await api(baseUrl, "/api/v1/requests", {
      cookie: requesterA.cookie, method: "POST", key: "create-request-a", body: { listingId: listing.id, message: "Request created with create-request-a" },
    });
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).replayed, true);
    assert.equal((await api(baseUrl, `/api/v1/requests/${requestB.id}`, { cookie: requesterA.cookie })).status, 403);

    const accept = (request, key) => api(baseUrl, `/api/v1/requests/${request.id}/status`, {
      cookie: owner.cookie, method: "PATCH", key, body: { status: "ACCEPTED" },
    });
    const acceptResponses = await Promise.all([accept(requestA, "accept-request-a"), accept(requestB, "accept-request-b")]);
    assert.deepEqual(acceptResponses.map((response) => response.status).sort(), [200, 409]);
    const acceptedResponse = acceptResponses.find((response) => response.status === 200);
    const acceptedBody = await acceptedResponse.json();
    const acceptedRequest = acceptedBody.request;
    const acceptedKey = acceptedRequest.id === requestA.id ? "accept-request-a" : "accept-request-b";
    const acceptedActor = acceptedRequest.id === requestA.id ? requesterA : requesterB;
    const pendingRequest = acceptedRequest.id === requestA.id ? requestB : requestA;
    const acceptedCount = await models.Request.countDocuments({ listingId: listing.id, status: "ACCEPTED" });
    assert.equal(acceptedCount, 1);
    assert.equal((await models.Listing.findById(listing.id)).status, "reserved");

    const acceptReplay = await api(baseUrl, `/api/v1/requests/${acceptedRequest.id}/status`, {
      cookie: owner.cookie, method: "PATCH", key: acceptedKey, body: { status: "ACCEPTED" },
    });
    assert.equal(acceptReplay.status, 200);
    assert.equal((await acceptReplay.json()).replayed, true);

    assert.equal((await api(baseUrl, `/api/v1/requests/${pendingRequest.id}/status`, {
      cookie: owner.cookie, method: "PATCH", key: "reject-losing-request", body: { status: "REJECTED" },
    })).status, 200);
    assert.equal((await api(baseUrl, `/api/v1/requests/${acceptedRequest.id}/status`, {
      cookie: acceptedActor.cookie, method: "PATCH", key: "complete-winning-request", body: { status: "COMPLETED" },
    })).status, 200);
    assert.equal((await models.Listing.findById(listing.id)).status, "closed");

    const cancelListingResponse = await api(baseUrl, "/api/v1/listings", { cookie: owner.cookie, method: "POST", body: {
      ...listingInput, title: "Cancellation integration ladder", description: "A listing used to verify pending cancellation.",
    } });
    const cancelListing = (await cancelListingResponse.json()).listing;
    const cancelledRequest = await createRequest(baseUrl, requesterA, cancelListing.id, "create-cancel-request");
    assert.equal((await api(baseUrl, `/api/v1/requests/${cancelledRequest.id}/status`, {
      cookie: requesterA.cookie, method: "PATCH", key: "cancel-pending-request", body: { status: "CANCELLED" },
    })).status, 200);

    const expiryListingResponse = await api(baseUrl, "/api/v1/listings", { cookie: owner.cookie, method: "POST", body: {
      ...listingInput, title: "Expiry integration saw", description: "A listing used to verify system expiry.",
    } });
    const expiryListing = (await expiryListingResponse.json()).listing;
    const expiryRequest = await createRequest(baseUrl, requesterB, expiryListing.id, "create-expiry-request");
    await models.Request.updateOne({ _id: expiryRequest.id }, { $set: { expiresAt: new Date(Date.now() - 1_000) } });
    assert.equal(await requestService.expireDue(new Date(), 100), 1);
    const expired = await api(baseUrl, `/api/v1/requests/${expiryRequest.id}`, { cookie: requesterB.cookie });
    assert.equal((await expired.json()).request.status, "EXPIRED");

    console.log("Atlas request integration passed: replay, privacy, accept race, unique slot, reject, complete, cancel, and expiry.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await cleanup();
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error(`Atlas request integration failed: ${error.name}: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
