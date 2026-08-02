const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { AppError } = require("../../shared/errors/AppError");
const { authRepository } = require("./auth.repository");

function normalizeIdentity(value) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function hashSessionSecret(secret) {
  return crypto.createHash("sha256").update(secret, "utf8").digest("hex");
}

function toUserDto(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    displayName: user.profile?.displayName || user.username,
    status: user.status,
    createdAt: user.createdAt,
  };
}

function createAuthService({ repository = authRepository, now = () => new Date(), randomBytes = crypto.randomBytes } = {}) {
  async function issueSession(userId, context, config) {
    const secret = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now().getTime() + config.SESSION_TTL_HOURS * 60 * 60 * 1000);
    const session = await repository.createSession({
      userId,
      secretHash: hashSessionSecret(secret),
      expiresAt,
      userAgent: context.userAgent,
    });
    return { id: session._id, secret, expiresAt };
  }

  async function register(input, context, config) {
    const usernameNormalized = normalizeIdentity(input.username);
    const emailNormalized = normalizeIdentity(input.email);
    const passwordHash = await bcrypt.hash(input.password, config.BCRYPT_ROUNDS);
    let user;
    try {
      user = await repository.createUser({
        username: input.username.trim(), usernameNormalized,
        email: input.email.trim(), emailNormalized, passwordHash,
        profile: { displayName: input.displayName || input.username.trim() }, status: "active",
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new AppError({ code: "IDENTITY_ALREADY_EXISTS", message: "Username or email is already registered", status: 409 });
      }
      throw error;
    }
    const session = await issueSession(user._id, context, config);
    await repository.recordAudit({ actorId: user._id, action: "auth.register", entityType: "user", entityId: user._id, requestId: context.requestId });
    return { user: toUserDto(user), session };
  }

  async function login(input, context, config) {
    const user = await repository.findUserForLogin(normalizeIdentity(input.identifier));
    const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : await bcrypt.compare(input.password, config.DUMMY_PASSWORD_HASH);
    if (!user || !valid) {
      throw new AppError({ code: "INVALID_CREDENTIALS", message: "Invalid username or password", status: 401 });
    }
    const session = await issueSession(user._id, context, config);
    await repository.recordAudit({ actorId: user._id, action: "auth.login", entityType: "session", entityId: session.id, requestId: context.requestId });
    return { user: toUserDto(user), session };
  }

  async function authenticate(secret) {
    if (!secret || !/^[a-zA-Z0-9_-]{40,60}$/.test(secret)) return null;
    const session = await repository.findActiveSession(hashSessionSecret(secret), now());
    if (!session) return null;
    const user = await repository.findUserById(session.userId);
    if (!user || user.status !== "active") return null;
    return { session, user, userDto: toUserDto(user) };
  }

  async function logout(session, context) {
    if (!session) return;
    await repository.revokeSession(session._id, now());
    await repository.recordAudit({ actorId: session.userId, action: "auth.logout", entityType: "session", entityId: session._id, requestId: context.requestId });
  }

  return { authenticate, login, logout, normalizeIdentity, register, toUserDto };
}

module.exports = { createAuthService, hashSessionSecret, normalizeIdentity, toUserDto };
