const assert = require("node:assert/strict");
const { test } = require("node:test");
const bcrypt = require("bcryptjs");
const { createAuthService, hashSessionSecret, normalizeIdentity, toUserDto } = require("../src/modules/auth/auth.service");
const { clearSessionCookie, parseCookies, sessionCookie } = require("../src/modules/auth/auth.cookies");

const fixedNow = new Date("2026-08-01T00:00:00.000Z");
const config = {
  BCRYPT_ROUNDS: 10,
  SESSION_TTL_HOURS: 24,
  SESSION_COOKIE_NAME: "streetcircle_session",
  NODE_ENV: "development",
  DUMMY_PASSWORD_HASH: "$2b$12$C6UzMDM.H6dfI/f/IKcEe.yrY7h9/rU7QqVq.VyGqj8hP6qE9K6Fe",
};

function objectId(value) { return { toString: () => value }; }

test("identity normalization is deterministic across case and compatibility characters", () => {
  assert.equal(normalizeIdentity("  Demo_User  "), "demo_user");
  assert.equal(normalizeIdentity("ＦＯＯ"), "foo");
});

test("user DTO excludes password hashes and normalized identity fields", () => {
  const dto = toUserDto({
    _id: objectId("user-1"), username: "demo", email: "demo@example.test", status: "active",
    passwordHash: "secret", usernameNormalized: "demo", emailNormalized: "demo@example.test",
    profile: { displayName: "Demo" }, createdAt: fixedNow,
  });
  assert.deepEqual(Object.keys(dto), ["id", "username", "email", "displayName", "status", "createdAt"]);
  assert.equal(JSON.stringify(dto).includes("secret"), false);
});

test("registration stores only a session hash and returns an opaque secret", async () => {
  const writes = {};
  const repository = {
    async createUser(data) { writes.user = data; return { ...data, _id: objectId("user-1"), createdAt: fixedNow }; },
    async createSession(data) { writes.session = data; return { ...data, _id: objectId("session-1") }; },
    async recordAudit(data) { writes.audit = data; },
  };
  const service = createAuthService({ repository, now: () => fixedNow, randomBytes: () => Buffer.alloc(32, 7) });
  const result = await service.register(
    { username: "Demo_User", email: "Demo@Example.test", password: "long-enough-password" },
    { requestId: "request-1", userAgent: "test" }, config,
  );
  assert.equal(writes.user.usernameNormalized, "demo_user");
  assert.equal(writes.user.emailNormalized, "demo@example.test");
  assert.notEqual(writes.user.passwordHash, "long-enough-password");
  assert.equal(writes.session.secretHash, hashSessionSecret(result.session.secret));
  assert.equal(JSON.stringify(writes.session).includes(result.session.secret), false);
});

test("missing and wrong login identities return the same generic public error", async () => {
  const hash = await bcrypt.hash("correct-password", 10);
  async function failureFor(user) {
    const repository = { async findUserForLogin() { return user; } };
    const service = createAuthService({ repository, now: () => fixedNow });
    return assert.rejects(
      () => service.login({ identifier: "someone", password: "wrong-password" }, {}, config),
      (error) => error.code === "INVALID_CREDENTIALS" && error.message === "Invalid username or password",
    );
  }
  await failureFor(null);
  await failureFor({ passwordHash: hash });
});

test("malformed, expired, and revoked session secrets are unauthenticated", async () => {
  let lookupCount = 0;
  const repository = {
    async findActiveSession() { lookupCount += 1; return null; },
  };
  const service = createAuthService({ repository, now: () => fixedNow });
  assert.equal(await service.authenticate("malformed"), null);
  assert.equal(lookupCount, 0);
  assert.equal(await service.authenticate(Buffer.alloc(32, 2).toString("base64url")), null);
  assert.equal(lookupCount, 1);
});

test("session cookies are HttpOnly, scoped, same-site, and secure in production", () => {
  const expiresAt = new Date("2026-08-02T00:00:00.000Z");
  const development = sessionCookie("opaque", config, expiresAt);
  assert.match(development, /HttpOnly/);
  assert.match(development, /SameSite=Lax/);
  assert.match(development, /Path=\/api\/v1/);
  assert.doesNotMatch(development, /Secure/);
  assert.match(sessionCookie("opaque", { ...config, NODE_ENV: "production" }, expiresAt), /Secure/);
  assert.match(clearSessionCookie(config), /Max-Age=0/);
  assert.equal(parseCookies("one=1; streetcircle_session=abc%201").streetcircle_session, "abc 1");
});
