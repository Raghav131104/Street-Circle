const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { detectImageSignature } = require("../src/infrastructure/local-storage/file-signature");
const { LocalMediaStore } = require("../src/infrastructure/local-storage/local-media-store");
const { createListingMediaService } = require("../src/modules/listings/listing-media.service");

const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from("safe-image")]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 1]);
const WEBP = Buffer.from("RIFF1234WEBPpayload", "ascii");
function id(value) { return { toString: () => value }; }

test("image type detection uses file bytes rather than the claimed MIME type", () => {
  assert.equal(detectImageSignature(PNG).mimeType, "image/png");
  assert.equal(detectImageSignature(JPEG).mimeType, "image/jpeg");
  assert.equal(detectImageSignature(WEBP).mimeType, "image/webp");
  assert.equal(detectImageSignature(Buffer.from("<script>alert(1)</script>")), null);
});

test("local media store generates safe keys, checksums bytes, and removes files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "streetcircle-media-"));
  try {
    const store = new LocalMediaStore(root);
    const metadata = await store.save(PNG);
    assert.match(metadata.key, /^[a-f0-9]{32}\.png$/);
    assert.equal(metadata.mimeType, "image/png");
    assert.equal((await store.read(metadata.key)).equals(PNG), true);
    await store.remove(metadata.key);
    await assert.rejects(store.read(metadata.key), (error) => error.code === "MEDIA_NOT_FOUND");
    await assert.rejects(store.read("../secret.png"), (error) => error.code === "INVALID_MEDIA_KEY");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("invalid bytes are rejected before anything is written", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "streetcircle-media-"));
  try {
    const store = new LocalMediaStore(root);
    await assert.rejects(store.save(Buffer.from("not an image")), (error) => error.code === "UNSUPPORTED_MEDIA_TYPE");
    assert.deepEqual(await fs.readdir(root), []);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("media upload cleans new files when the atomic database append loses a race", async () => {
  const removed = [];
  const listing = { _id: id("listing-1"), authorId: id("actor-1"), communityId: id("community-1"), media: [], status: "active" };
  const repository = {
    async findById() { return listing; },
    async findMembership() { return null; },
    async appendMedia() { return null; },
  };
  const mediaStore = {
    async save() { return { key: "a".repeat(32) + ".png", mimeType: "image/png", size: 10, checksumSha256: "f".repeat(64), createdAt: new Date() }; },
    async remove(key) { removed.push(key); },
  };
  const service = createListingMediaService({ repository, mediaStore });
  await assert.rejects(service.upload("actor-1", "listing-1", [{ buffer: PNG }]), (error) => error.code === "MEDIA_LIMIT_CONFLICT");
  assert.deepEqual(removed, ["a".repeat(32) + ".png"]);
});

test("media upload refuses a sixth image before writing to disk", async () => {
  const listing = { authorId: id("actor-1"), communityId: id("community-1"), media: Array(5).fill({}), status: "active" };
  let saves = 0;
  const service = createListingMediaService({
    repository: { async findById() { return listing; }, async findMembership() { return null; } },
    mediaStore: { async save() { saves += 1; } },
  });
  await assert.rejects(service.upload("actor-1", "listing-1", [{ buffer: PNG }]), (error) => error.code === "MEDIA_LIMIT_EXCEEDED");
  assert.equal(saves, 0);
});
