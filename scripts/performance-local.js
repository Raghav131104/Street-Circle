const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { performance, monitorEventLoopDelay } = require("node:perf_hooks");
const crypto = require("node:crypto");
const bcrypt = require(path.join(__dirname, "..", "backend", "node_modules", "bcryptjs"));
const dotenv = require(path.join(__dirname, "..", "backend", "node_modules", "dotenv"));
const mongoose = require(path.join(__dirname, "..", "backend", "node_modules", "mongoose"));
const { loadEnv } = require("../backend/src/config/env");
const { createApp } = require("../backend/src/app");
const { createLogger } = require("../backend/src/shared/logging/logger");
const { hashSessionSecret } = require("../backend/src/modules/auth/auth.service");
const { models, syncIndexes } = require("../backend/src/infrastructure/database/models");

dotenv.config({ path: path.join(__dirname, "..", "backend", ".env"), quiet: true });

const MARKER = "perf_streetcircle_20260802";
const PASSWORD = "PerformanceOnly!2026";
const DATASET_SIZE = 1_000;
const MUMBAI = Object.freeze({ longitude: 72.8777, latitude: 19.076 });

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function connect(uri) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 20_000,
        connectTimeoutMS: 20_000,
        socketTimeoutMS: 30_000,
        maxPoolSize: 10,
        family: 4,
      });
      return;
    } catch (error) {
      lastError = error;
      await mongoose.disconnect().catch(() => {});
      if (attempt < 3) {
        console.warn(`Performance database connection attempt ${attempt}/3 failed; retrying safely.`);
        await delay(attempt * 1_000);
      }
    }
  }
  throw lastError;
}

async function cleanup() {
  const users = await models.User.find({ emailNormalized: { $regex: `^${MARKER}` } }).select("_id");
  const userIds = users.map((record) => record._id);
  const communities = await models.Community.find({ slug: MARKER }).select("_id");
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

function percentile(sorted, fraction) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

async function runWorkload({ name, total, concurrency, request }) {
  let next = 0;
  const latencies = [];
  const failures = [];
  const cpuStart = process.cpuUsage();
  const memoryStart = process.memoryUsage().rss;
  const startedAt = performance.now();

  async function worker() {
    while (next < total) {
      const index = next;
      next += 1;
      const requestStarted = performance.now();
      try {
        const response = await request(index);
        await response.arrayBuffer();
        latencies.push(performance.now() - requestStarted);
        if (!response.ok) failures.push({ index, status: response.status });
      } catch (error) {
        latencies.push(performance.now() - requestStarted);
        failures.push({ index, error: error.message });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  const durationMs = performance.now() - startedAt;
  const cpu = process.cpuUsage(cpuStart);
  const sorted = latencies.toSorted((left, right) => left - right);
  return {
    name,
    requests: total,
    concurrency,
    durationMs: Number(durationMs.toFixed(2)),
    throughputPerSecond: Number(((total * 1_000) / durationMs).toFixed(2)),
    latencyMs: {
      p50: Number(percentile(sorted, 0.5).toFixed(2)),
      p95: Number(percentile(sorted, 0.95).toFixed(2)),
      p99: Number(percentile(sorted, 0.99).toFixed(2)),
      max: Number((sorted.at(-1) || 0).toFixed(2)),
    },
    failures,
    errorRate: Number((failures.length / total).toFixed(4)),
    processCpuMs: Number(((cpu.user + cpu.system) / 1_000).toFixed(2)),
    rssDeltaMb: Number(((process.memoryUsage().rss - memoryStart) / 1024 / 1024).toFixed(2)),
  };
}

function jsonRequest(baseUrl, pathname, { cookie, method = "GET", body, key } = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      origin: "http://localhost:5173",
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...(key ? { "idempotency-key": key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function createFixture(config) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [owner, requester] = await models.User.create([
    {
      username: `${MARKER}_owner`, usernameNormalized: `${MARKER}_owner`,
      email: `${MARKER}_owner@streetcircle.test`, emailNormalized: `${MARKER}_owner@streetcircle.test`,
      passwordHash, profile: { displayName: "Performance owner" }, status: "active",
    },
    {
      username: `${MARKER}_requester`, usernameNormalized: `${MARKER}_requester`,
      email: `${MARKER}_requester@streetcircle.test`, emailNormalized: `${MARKER}_requester@streetcircle.test`,
      passwordHash, profile: { displayName: "Performance requester" }, status: "active",
    },
  ]);
  const community = await models.Community.create({
    name: "Performance StreetCircle", slug: MARKER,
    description: "Marker-scoped local performance fixture.",
    center: { type: "Point", coordinates: [MUMBAI.longitude, MUMBAI.latitude] },
    coverageRadiusMeters: 20_000, ownerId: owner._id, visibility: "public",
    joinPolicy: "approval", rules: [], status: "active",
  });
  await models.Membership.create([
    { userId: owner._id, communityId: community._id, role: "owner", status: "active", joinedAt: new Date() },
    { userId: requester._id, communityId: community._id, role: "member", status: "active", joinedAt: new Date() },
  ]);

  const listings = Array.from({ length: DATASET_SIZE }, (_, index) => ({
    authorId: owner._id,
    communityId: community._id,
    title: `Performance listing ${index.toString().padStart(4, "0")}`,
    description: `Deterministic performance fixture number ${index} for nearby feed measurement.`,
    type: index % 5 === 0 ? "skill" : "item",
    category: index % 3 === 0 ? "tools" : index % 3 === 1 ? "home" : "learning",
    price: index % 250,
    location: {
      type: "Point",
      coordinates: [MUMBAI.longitude + (index % 20) * 0.0001, MUMBAI.latitude + (index % 25) * 0.0001],
    },
    media: [],
    status: "active",
  }));
  const insertedListings = await models.Listing.insertMany(listings, { ordered: true });

  async function createCookie(userId) {
    const secret = crypto.randomBytes(32).toString("base64url");
    await models.Session.create({
      userId,
      secretHash: hashSessionSecret(secret),
      expiresAt: new Date(Date.now() + config.SESSION_TTL_HOURS * 60 * 60 * 1_000),
      userAgent: "StreetCircle local performance harness",
    });
    return `${config.SESSION_COOKIE_NAME}=${secret}`;
  }

  return {
    community,
    owner,
    requester,
    ownerCookie: await createCookie(owner._id),
    requesterCookie: await createCookie(requester._id),
    requestTargets: insertedListings.slice(0, 20),
  };
}

async function main() {
  const config = loadEnv({ ...process.env, NODE_ENV: "test", LOG_LEVEL: "silent", BCRYPT_ROUNDS: "10" });
  const databaseName = new URL(config.databaseUri).pathname.slice(1);
  if (databaseName !== "streetcircle_test") {
    throw new Error(`Refusing performance test: expected streetcircle_test, received ${databaseName || "no database"}`);
  }
  await connect(config.databaseUri);
  await syncIndexes();
  await cleanup();
  const fixture = await createFixture(config);
  const app = createApp({
    config,
    logger: createLogger({ level: "silent" }),
    readiness: { databaseName, isDatabaseReady: async () => mongoose.connection.readyState === 1 },
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const eventLoop = monitorEventLoopDelay({ resolution: 20 });
  eventLoop.enable();

  try {
    const feedPath = `/api/v1/listings?longitude=${MUMBAI.longitude}&latitude=${MUMBAI.latitude}&radiusMeters=20000&communityId=${fixture.community._id}&limit=20`;
    await jsonRequest(baseUrl, feedPath).then((response) => response.arrayBuffer());
    await jsonRequest(baseUrl, "/api/v1/auth/login", {
      method: "POST", body: { identifier: `${MARKER}_owner`, password: PASSWORD },
    }).then((response) => response.arrayBuffer());

    const workloads = [];
    workloads.push(await runWorkload({
      name: "nearby-listing-feed", total: 50, concurrency: 10,
      request: () => jsonRequest(baseUrl, feedPath),
    }));
    workloads.push(await runWorkload({
      name: "login", total: 8, concurrency: 2,
      request: () => jsonRequest(baseUrl, "/api/v1/auth/login", {
        method: "POST", body: { identifier: `${MARKER}_owner`, password: PASSWORD },
      }),
    }));
    workloads.push(await runWorkload({
      name: "listing-creation", total: 20, concurrency: 5,
      request: (index) => jsonRequest(baseUrl, "/api/v1/listings", {
        cookie: fixture.ownerCookie,
        method: "POST",
        body: {
          communityId: fixture.community._id.toString(),
          title: `Measured listing ${index}`,
          description: `Measured listing creation request number ${index}.`,
          type: "item", category: "tools", price: index,
          longitude: MUMBAI.longitude, latitude: MUMBAI.latitude,
        },
      }),
    }));
    workloads.push(await runWorkload({
      name: "request-creation", total: 20, concurrency: 5,
      request: (index) => jsonRequest(baseUrl, "/api/v1/requests", {
        cookie: fixture.requesterCookie,
        method: "POST",
        key: `perf-request-${index.toString().padStart(4, "0")}`,
        body: { listingId: fixture.requestTargets[index]._id.toString(), message: `Measured request ${index}` },
      }),
    }));

    eventLoop.disable();
    const result = {
      measuredAt: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: `${process.platform}-${process.arch}`,
        cpu: os.cpus()[0]?.model || "unknown",
        logicalCpuCount: os.cpus().length,
        totalMemoryGb: Number((os.totalmem() / 1024 / 1024 / 1024).toFixed(2)),
        database: "MongoDB Atlas M0 (streetcircle_test)",
        datasetListings: DATASET_SIZE,
        topology: "API, load generator, and metrics collector in one local Node process",
      },
      workloads,
      eventLoopDelayMs: {
        mean: Number((eventLoop.mean / 1e6).toFixed(2)),
        p95: Number((eventLoop.percentile(95) / 1e6).toFixed(2)),
        p99: Number((eventLoop.percentile(99) / 1e6).toFixed(2)),
        max: Number((eventLoop.max / 1e6).toFixed(2)),
      },
    };
    const outputDirectory = path.join(__dirname, "..", "project-data", "performance");
    try {
      await fs.mkdir(outputDirectory, { recursive: true });
      await fs.writeFile(path.join(outputDirectory, "latest.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
    } catch (error) {
      if (error.code !== "EPERM" && error.code !== "EACCES") throw error;
      console.warn("Could not persist the generated performance artifact in this restricted runner; stdout remains the measured record.");
    }
    console.log(JSON.stringify(result, null, 2));
    if (workloads.some((workload) => workload.failures.length > 0)) process.exitCode = 1;
  } finally {
    eventLoop.disable();
    await new Promise((resolve) => server.close(resolve));
    await cleanup();
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error(`Performance run failed: ${error.name}: ${error.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
