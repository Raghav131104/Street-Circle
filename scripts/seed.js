const path = require("node:path");
const bcrypt = require(path.join(__dirname, "..", "backend", "node_modules", "bcryptjs"));
const mongoose = require(path.join(__dirname, "..", "backend", "node_modules", "mongoose"));
const { requireDevelopmentUri } = require("./database-runtime");
const { models, syncIndexes } = require("../backend/src/infrastructure/database/models");

const ids = {
  owner: new mongoose.Types.ObjectId("650000000000000000000001"),
  member: new mongoose.Types.ObjectId("650000000000000000000002"),
  community: new mongoose.Types.ObjectId("650000000000000000000010"),
  listing: new mongoose.Types.ObjectId("650000000000000000000020"),
};

async function main() {
  await mongoose.connect(requireDevelopmentUri(), { serverSelectionTimeoutMS: 15_000, family: 4 });
  await syncIndexes();
  const passwordHash = await bcrypt.hash("StreetCircleDemo!2026", 12);

  await models.User.bulkWrite([
    { updateOne: {
      filter: { _id: ids.owner },
      update: { $set: {
        username: "demo_owner", usernameNormalized: "demo_owner",
        email: "owner@streetcircle.local", emailNormalized: "owner@streetcircle.local",
        passwordHash, profile: { displayName: "Demo Owner", bio: "Owns the seeded community." }, status: "active",
      } }, upsert: true,
    } },
    { updateOne: {
      filter: { _id: ids.member },
      update: { $set: {
        username: "demo_member", usernameNormalized: "demo_member",
        email: "member@streetcircle.local", emailNormalized: "member@streetcircle.local",
        passwordHash, profile: { displayName: "Demo Member", bio: "Tests neighborhood sharing." }, status: "active",
      } }, upsert: true,
    } },
  ]);

  await models.Community.updateOne({ _id: ids.community }, { $set: {
    name: "Mumbai Neighbourhood Circle", slug: "mumbai-neighbourhood-circle",
    description: "Deterministic local community used by the StreetCircle demo.",
    center: { type: "Point", coordinates: [72.8777, 19.076] }, coverageRadiusMeters: 10_000,
    ownerId: ids.owner, visibility: "public", joinPolicy: "approval",
    rules: ["Be respectful", "Describe listings honestly"], status: "active",
  } }, { upsert: true });

  await models.Membership.bulkWrite([
    { updateOne: { filter: { userId: ids.owner, communityId: ids.community }, update: { $set: {
      role: "owner", status: "active", joinedAt: new Date("2026-01-01T00:00:00.000Z"),
    } }, upsert: true } },
    { updateOne: { filter: { userId: ids.member, communityId: ids.community }, update: { $set: {
      role: "member", status: "active", joinedAt: new Date("2026-01-02T00:00:00.000Z"), decidedBy: ids.owner,
    } }, upsert: true } },
  ]);

  await models.Listing.updateOne({ _id: ids.listing }, { $set: {
    authorId: ids.owner, communityId: ids.community, title: "Cordless drill to borrow",
    description: "A working cordless drill available for short neighborhood projects.",
    type: "item", category: "tools", price: 0,
    location: { type: "Point", coordinates: [72.8777, 19.076] }, media: [], status: "active",
  } }, { upsert: true });

  await models.Notification.updateOne(
    { userId: ids.member, deduplicationKey: "seed-welcome-demo-member" },
    { $set: { type: "welcome", title: "Welcome to StreetCircle", body: "Your seeded demo account is ready.",
      entityType: "community", entityId: ids.community, readAt: null } },
    { upsert: true },
  );

  console.log("Seed complete: demo_owner and demo_member (password: StreetCircleDemo!2026).");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(`Seed failed: ${error.name}: ${error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, "[REDACTED_URI]")}`);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
