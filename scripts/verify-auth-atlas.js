const path = require("node:path");
const assert = require("node:assert/strict");
const dotenv = require(path.join(__dirname, "..", "backend", "node_modules", "dotenv"));
const mongoose = require(path.join(__dirname, "..", "backend", "node_modules", "mongoose"));
const { loadEnv } = require("../backend/src/config/env");
const { createLogger } = require("../backend/src/shared/logging/logger");
const { createApp } = require("../backend/src/app");
const { models, syncIndexes } = require("../backend/src/infrastructure/database/models");

dotenv.config({ path: path.join(__dirname, "..", "backend", ".env"), quiet: true });
const marker = "auth_verifier_20260801";

async function cleanup() {
  const users = await models.User.find({ emailNormalized: `${marker}@streetcircle.test` }).select("_id");
  const userIds = users.map((user) => user._id);
  if (userIds.length) {
    await models.Session.deleteMany({ userId: { $in: userIds } });
    await models.AuditEvent.deleteMany({ actorId: { $in: userIds } });
    await models.User.deleteMany({ _id: { $in: userIds } });
  }
}

async function request(baseUrl, pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { "content-type": "application/json", origin: "http://localhost:5173", ...options.headers },
  });
}

async function connectTestDatabase(uri) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 20_000,
        connectTimeoutMS: 20_000,
        socketTimeoutMS: 30_000,
        maxPoolSize: 5,
        family: 4,
      });
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

async function main() {
  const config = loadEnv({ ...process.env, NODE_ENV: "test", LOG_LEVEL: "silent" });
  const databaseName = new URL(config.databaseUri).pathname.slice(1);
  assert.equal(databaseName, "streetcircle_test", "Verifier refuses any database except streetcircle_test");
  await connectTestDatabase(config.databaseUri);
  await syncIndexes();
  await cleanup();

  const logger = createLogger({ level: "silent" });
  const readiness = { databaseName, isDatabaseReady: async () => mongoose.connection.readyState === 1 };
  const app = createApp({ config, logger, readiness });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const registration = await request(baseUrl, "/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: marker, email: `${marker}@streetcircle.test`, password: "AuthVerifier!2026" }),
    });
    assert.equal(registration.status, 201);
    const setCookie = registration.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/);
    assert.equal(setCookie.includes("AuthVerifier!2026"), false);
    const cookie = setCookie.split(";", 1)[0];

    const me = await request(baseUrl, "/api/v1/auth/me", { headers: { cookie } });
    assert.equal(me.status, 200);
    const meBody = await me.json();
    assert.equal(meBody.user.username, marker);
    assert.equal("passwordHash" in meBody.user, false);

    const duplicate = await request(baseUrl, "/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: marker, email: `${marker}@streetcircle.test`, password: "AuthVerifier!2026" }),
    });
    assert.equal(duplicate.status, 409);

    const malformed = await request(baseUrl, "/api/v1/auth/me", {
      headers: { cookie: `${config.SESSION_COOKIE_NAME}=malformed` },
    });
    assert.equal(malformed.status, 401);

    const logout = await request(baseUrl, "/api/v1/auth/logout", { method: "POST", headers: { cookie } });
    assert.equal(logout.status, 204);
    const revoked = await request(baseUrl, "/api/v1/auth/me", { headers: { cookie } });
    assert.equal(revoked.status, 401);

    let rateLimited = false;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await request(baseUrl, "/api/v1/auth/login", { method: "POST", body: "{}" });
      if (response.status === 429) { rateLimited = true; break; }
    }
    assert.equal(rateLimited, true);
    console.log("Atlas auth integration passed: register, duplicate, me, malformed cookie, logout/revocation, rate limit.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await cleanup();
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error(`Atlas auth integration failed: ${error.name}: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
