import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const frontendDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rootDir = path.dirname(frontendDir);
const dotenv = require(path.join(rootDir, "backend", "node_modules", "dotenv"));
const mongoose = require(path.join(rootDir, "backend", "node_modules", "mongoose"));
const { models } = require(path.join(rootDir, "backend", "src", "infrastructure", "database", "models"));
const transientNetworkError = /MongoNetworkError|MongoServerSelectionError|querySrv|SSL alert|tlsv1 alert|ETIMEOUT|ETIMEDOUT|ECONNRESET/i;

async function cleanupOnce(uri) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30_000,
    connectTimeoutMS: 30_000,
    socketTimeoutMS: 30_000,
    maxPoolSize: 5,
    family: 4,
  });
  const users = await models.User.find({ emailNormalized: /^e2e_/ }).select("_id").lean();
  const userIds = users.map((record) => record._id);
  const communities = await models.Community.find({ name: /^E2E Circle / }).select("_id").lean();
  const communityIds = communities.map((record) => record._id);
  const listings = await models.Listing.find({ communityId: { $in: communityIds } }).select("_id media.key").lean();
  const listingIds = listings.map((record) => record._id);
  const uploadRoot = path.join(rootDir, "project-data", "uploads");
  await Promise.allSettled(listings.flatMap((listing) => listing.media || []).map((media) => fs.unlink(path.join(uploadRoot, media.key))));
  await models.Notification.deleteMany({ userId: { $in: userIds } });
  await models.Request.deleteMany({ $or: [{ requesterId: { $in: userIds } }, { listingId: { $in: listingIds } }] });
  await models.Listing.deleteMany({ _id: { $in: listingIds } });
  await models.Membership.deleteMany({ $or: [{ userId: { $in: userIds } }, { communityId: { $in: communityIds } }] });
  await models.Community.deleteMany({ _id: { $in: communityIds } });
  await models.Session.deleteMany({ userId: { $in: userIds } });
  await models.AuditEvent.deleteMany({ actorId: { $in: userIds } });
  await models.User.deleteMany({ _id: { $in: userIds } });
}

export default async function cleanup() {
  dotenv.config({ path: path.join(rootDir, "backend", ".env"), quiet: true });
  const uri = process.env.MONGODB_TEST_URI;
  if (!uri || new URL(uri).pathname.slice(1) !== "streetcircle_test") {
    throw new Error("E2E cleanup refused: MONGODB_TEST_URI must target streetcircle_test");
  }
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await cleanupOnce(uri);
      await mongoose.disconnect();
      return;
    } catch (error) {
      await mongoose.disconnect().catch(() => {});
      if (!transientNetworkError.test(`${error.name}: ${error.message}`) || attempt === 3) throw error;
      console.warn(`E2E cleanup network attempt ${attempt}/3 failed; retrying marker-scoped cleanup.`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
}
