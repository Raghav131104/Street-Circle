const assert = require("node:assert/strict");
const path = require("node:path");
const dotenv = require(path.join(__dirname, "..", "backend", "node_modules", "dotenv"));
const mongoose = require(path.join(__dirname, "..", "backend", "node_modules", "mongoose"));
const { loadEnv } = require("../backend/src/config/env");
const { createLogger } = require("../backend/src/shared/logging/logger");
const { createApp } = require("../backend/src/app");
const { createNotificationService } = require("../backend/src/modules/notifications/notification.service");
const { models, syncIndexes } = require("../backend/src/infrastructure/database/models");

dotenv.config({ path: path.join(__dirname, "..", "backend", ".env"), quiet: true });
const marker = "notification_verifier_20260802";

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
        console.warn(`Atlas notification test connection attempt ${attempt}/3 failed; retrying safely.`);
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
    username: `${marker}_${suffix}`, email: `${marker}_${suffix}@streetcircle.test`, password: "NotificationVerifier!2026",
  } });
  assert.equal(response.status, 201);
  return { cookie: response.headers.get("set-cookie").split(";", 1)[0], user: (await response.json()).user };
}

async function start(config) {
  const notificationService = createNotificationService();
  const app = createApp({ config, logger: createLogger({ level: "silent" }), services: { notification: notificationService }, readiness: {
    databaseName: "streetcircle_test", isDatabaseReady: async () => true,
  } });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}`, notificationService };
}

async function stop(server) {
  await new Promise((resolve) => server.close(resolve));
}

async function main() {
  const config = loadEnv({ ...process.env, NODE_ENV: "test", LOG_LEVEL: "silent" });
  assert.equal(new URL(config.databaseUri).pathname.slice(1), "streetcircle_test");
  await connect(config.databaseUri);
  await syncIndexes();
  await cleanup();
  let runtime = await start(config);

  try {
    const owner = await register(runtime.baseUrl, "owner");
    const member = await register(runtime.baseUrl, "member");
    const communityResponse = await api(runtime.baseUrl, "/api/v1/communities", { cookie: owner.cookie, method: "POST", body: {
      name: marker, description: "Notification persistence verification.", longitude: 72.8777,
      latitude: 19.076, coverageRadiusMeters: 5000, visibility: "public", joinPolicy: "approval", rules: [],
    } });
    const community = (await communityResponse.json()).community;
    const joinResponse = await api(runtime.baseUrl, `/api/v1/communities/${community.id}/memberships`, { cookie: member.cookie, method: "POST" });
    const membership = (await joinResponse.json()).membership;

    const ownerCount = await api(runtime.baseUrl, "/api/v1/notifications/unread-count", { cookie: owner.cookie });
    assert.equal((await ownerCount.json()).unreadCount, 1);
    const ownerFeed = await api(runtime.baseUrl, "/api/v1/notifications?limit=1", { cookie: owner.cookie });
    const ownerNotification = (await ownerFeed.json()).notifications[0];
    assert.equal(ownerNotification.type, "membership.requested");
    assert.equal((await api(runtime.baseUrl, `/api/v1/notifications/${ownerNotification.id}/read`, { cookie: member.cookie, method: "PATCH" })).status, 404);

    await stop(runtime.server);
    runtime = await start(config);
    const afterRestart = await api(runtime.baseUrl, "/api/v1/notifications", { cookie: owner.cookie });
    assert.equal((await afterRestart.json()).notifications.some((item) => item.id === ownerNotification.id), true);
    assert.equal((await api(runtime.baseUrl, `/api/v1/notifications/${ownerNotification.id}/read`, { cookie: owner.cookie, method: "PATCH" })).status, 200);
    assert.equal((await (await api(runtime.baseUrl, "/api/v1/notifications/unread-count", { cookie: owner.cookie })).json()).unreadCount, 0);

    assert.equal((await api(runtime.baseUrl, `/api/v1/communities/${community.id}/memberships/${membership.id}`, {
      cookie: owner.cookie, method: "PATCH", body: { action: "approve" },
    })).status, 200);
    const memberMembershipFeed = await api(runtime.baseUrl, "/api/v1/notifications", { cookie: member.cookie });
    assert.equal((await memberMembershipFeed.json()).notifications.some((item) => item.type === "membership.approve"), true);

    const listingResponse = await api(runtime.baseUrl, "/api/v1/listings", { cookie: owner.cookie, method: "POST", body: {
      communityId: community.id, title: "Notification integration drill", description: "A listing used to verify request notifications.",
      type: "item", category: "tools", price: 0, longitude: 72.8777, latitude: 19.076,
    } });
    const listing = (await listingResponse.json()).listing;
    const requestResponse = await api(runtime.baseUrl, "/api/v1/requests", {
      cookie: member.cookie, method: "POST", key: "notification-create-request", body: { listingId: listing.id, message: "Please reserve it" },
    });
    const request = (await requestResponse.json()).request;
    const ownerRequestFeed = await api(runtime.baseUrl, "/api/v1/notifications", { cookie: owner.cookie });
    assert.equal((await ownerRequestFeed.json()).notifications.some((item) => item.type === "request.created"), true);
    assert.equal((await api(runtime.baseUrl, `/api/v1/requests/${request.id}/status`, {
      cookie: owner.cookie, method: "PATCH", key: "notification-accept-request", body: { status: "ACCEPTED" },
    })).status, 200);
    const memberStatusFeed = await api(runtime.baseUrl, "/api/v1/notifications", { cookie: member.cookie });
    assert.equal((await memberStatusFeed.json()).notifications.some((item) => item.type === "request.accepted"), true);
    const markAll = await api(runtime.baseUrl, "/api/v1/notifications/read-all", { cookie: member.cookie, method: "PATCH" });
    assert.ok((await markAll.json()).updatedCount >= 1);
    assert.equal((await (await api(runtime.baseUrl, "/api/v1/notifications/unread-count", { cookie: member.cookie })).json()).unreadCount, 0);

    console.log("Atlas notification integration passed: membership/request hooks, privacy, unread/read-all, and restart persistence.");
  } finally {
    if (runtime?.server?.listening) await stop(runtime.server);
    await cleanup();
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error(`Atlas notification integration failed: ${error.name}: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
