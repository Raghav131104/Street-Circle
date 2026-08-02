const path = require("node:path");
const assert = require("node:assert/strict");
const dotenv = require(path.join(__dirname, "..", "backend", "node_modules", "dotenv"));
const mongoose = require(path.join(__dirname, "..", "backend", "node_modules", "mongoose"));
const { loadEnv } = require("../backend/src/config/env");
const { createLogger } = require("../backend/src/shared/logging/logger");
const { createApp } = require("../backend/src/app");
const { models, syncIndexes } = require("../backend/src/infrastructure/database/models");

dotenv.config({ path: path.join(__dirname, "..", "backend", ".env"), quiet: true });
const marker = "community_verifier_20260801";

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
  const userIds = users.map((user) => user._id);
  const communities = await models.Community.find({ name: marker }).select("_id");
  const communityIds = communities.map((community) => community._id);
  await models.Notification.deleteMany({ userId: { $in: userIds } });
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
    username: `${marker}_${suffix}`, email: `${marker}_${suffix}@streetcircle.test`, password: "CommunityVerifier!2026",
  } });
  assert.equal(response.status, 201);
  return response.headers.get("set-cookie").split(";", 1)[0];
}

async function main() {
  const config = loadEnv({ ...process.env, NODE_ENV: "test", LOG_LEVEL: "silent" });
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
    const ownerCookie = await register(baseUrl, "owner");
    const memberCookie = await register(baseUrl, "member");
    const rejectedCookie = await register(baseUrl, "rejected");
    const created = await api(baseUrl, "/api/v1/communities", { cookie: ownerCookie, method: "POST", body: {
      name: marker, description: "A deterministic community integration test.",
      longitude: 72.8777, latitude: 19.076, coverageRadiusMeters: 5000,
      visibility: "public", joinPolicy: "approval", rules: ["Test safely"],
    } });
    assert.equal(created.status, 201);
    const community = (await created.json()).community;

    const join = await api(baseUrl, `/api/v1/communities/${community.id}/memberships`, { cookie: memberCookie, method: "POST" });
    assert.equal(join.status, 201);
    const membership = (await join.json()).membership;
    assert.equal(membership.status, "pending");
    const duplicate = await api(baseUrl, `/api/v1/communities/${community.id}/memberships`, { cookie: memberCookie, method: "POST" });
    assert.equal(duplicate.status, 409);

    const forbidden = await api(baseUrl, `/api/v1/communities/${community.id}/memberships/${membership.id}`, {
      cookie: memberCookie, method: "PATCH", body: { action: "approve" },
    });
    assert.equal(forbidden.status, 403);
    const approved = await api(baseUrl, `/api/v1/communities/${community.id}/memberships/${membership.id}`, {
      cookie: ownerCookie, method: "PATCH", body: { action: "approve" },
    });
    assert.equal(approved.status, 200);

    const promoted = await api(baseUrl, `/api/v1/communities/${community.id}/memberships/${membership.id}`, {
      cookie: ownerCookie, method: "PATCH", body: { action: "change_role", role: "moderator" },
    });
    assert.equal(promoted.status, 200);
    const left = await api(baseUrl, `/api/v1/communities/${community.id}/memberships/me`, { cookie: memberCookie, method: "DELETE" });
    assert.equal(left.status, 200);

    const rejectJoin = await api(baseUrl, `/api/v1/communities/${community.id}/memberships`, { cookie: rejectedCookie, method: "POST" });
    const rejectMembership = (await rejectJoin.json()).membership;
    const rejected = await api(baseUrl, `/api/v1/communities/${community.id}/memberships/${rejectMembership.id}`, {
      cookie: ownerCookie, method: "PATCH", body: { action: "reject" },
    });
    assert.equal(rejected.status, 200);
    console.log("Atlas community integration passed: create, owner, join, duplicate, forbidden moderation, approve, role, leave, reject.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await cleanup();
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error(`Atlas community integration failed: ${error.name}: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
