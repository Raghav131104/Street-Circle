const assert = require("node:assert/strict");
const { test } = require("node:test");
const { assertTransitionAllowed } = require("../src/modules/requests/request.machine");
const { createRequestService } = require("../src/modules/requests/request.service");

function id(value) { return { toString: () => value }; }
function requestRecord(overrides = {}) {
  return {
    _id: id(overrides.id || "650000000000000000000030"),
    listingId: id(overrides.listingId || "650000000000000000000020"),
    requesterId: id(overrides.requesterId || "650000000000000000000002"),
    ownerId: id(overrides.ownerId || "650000000000000000000001"),
    message: "Please reserve this for me",
    status: "PENDING",
    statusHistory: [],
    expiresAt: new Date("2026-08-09T00:00:00.000Z"),
    createdAt: new Date("2026-08-02T00:00:00.000Z"),
    updatedAt: new Date("2026-08-02T00:00:00.000Z"),
    ...overrides,
  };
}

test("request transition policy defines owner, requester, participant, and system actions", () => {
  const pending = requestRecord();
  assert.doesNotThrow(() => assertTransitionAllowed(pending, pending.ownerId.toString(), "ACCEPTED"));
  assert.doesNotThrow(() => assertTransitionAllowed(pending, pending.ownerId.toString(), "REJECTED"));
  assert.doesNotThrow(() => assertTransitionAllowed(pending, pending.requesterId.toString(), "CANCELLED"));
  assert.throws(() => assertTransitionAllowed(pending, pending.requesterId.toString(), "ACCEPTED"), (error) => error.code === "REQUEST_TRANSITION_INVALID");
  assert.throws(() => assertTransitionAllowed(pending, "outsider", "CANCELLED"), (error) => error.code === "REQUEST_FORBIDDEN");
  assert.doesNotThrow(() => assertTransitionAllowed(pending, null, "EXPIRED", { system: true }));

  const accepted = requestRecord({ status: "ACCEPTED" });
  assert.doesNotThrow(() => assertTransitionAllowed(accepted, accepted.ownerId.toString(), "COMPLETED"));
  assert.doesNotThrow(() => assertTransitionAllowed(accepted, accepted.requesterId.toString(), "COMPLETED"));
  assert.doesNotThrow(() => assertTransitionAllowed(accepted, accepted.ownerId.toString(), "CANCELLED"));
  assert.throws(() => assertTransitionAllowed(accepted, accepted.ownerId.toString(), "REJECTED"), (error) => error.status === 409);
});

test("request creation derives owner/requester and replays the same idempotency key", async () => {
  let created;
  const listing = { _id: id("650000000000000000000020"), authorId: id("owner"), communityId: id("community"), status: "active" };
  const repository = {
    async findIdempotent(_actor, key) { return created?.idempotencyKey === key ? created : null; },
    async findListing() { return listing; },
    async findMembership() { return { status: "active" }; },
    async create(data) { created = requestRecord({ ...data, _id: id("650000000000000000000030"), createdAt: data.statusHistory[0].at, updatedAt: data.statusHistory[0].at }); return created; },
  };
  const service = createRequestService({ repository, now: () => new Date("2026-08-02T00:00:00.000Z") });
  const first = await service.create("requester", { listingId: listing._id.toString(), message: "Please reserve this for me" }, "create-request-001");
  const replay = await service.create("requester", { listingId: listing._id.toString(), message: "Please reserve this for me" }, "create-request-001");
  assert.equal(first.request.ownerId, "owner");
  assert.equal(first.request.requesterId, "requester");
  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  await assert.rejects(
    service.create("requester", { listingId: listing._id.toString(), message: "Different payload" }, "create-request-001"),
    (error) => error.code === "IDEMPOTENCY_KEY_REUSED",
  );
});

test("private request details reject unrelated authenticated users", async () => {
  const service = createRequestService({ repository: { async findById() { return requestRecord(); } } });
  await assert.rejects(service.get("outsider", "request-id"), (error) => error.code === "REQUEST_FORBIDDEN" && error.status === 403);
});

test("simultaneous accepts allow exactly one winner for an exclusive listing", async () => {
  const requests = new Map([
    ["request-a", requestRecord({ id: "request-a", requesterId: id("requester-a") })],
    ["request-b", requestRecord({ id: "request-b", requesterId: id("requester-b") })],
  ]);
  let acceptedRequest = null;
  const repository = {
    async findById(requestId) { return requests.get(requestId); },
    async transition(input) {
      await new Promise((resolve) => setImmediate(resolve));
      const current = requests.get(input.requestId);
      if (current.status !== input.source) return null;
      if (input.target === "ACCEPTED" && acceptedRequest && acceptedRequest !== input.requestId) {
        const duplicate = new Error("duplicate accepted slot");
        duplicate.code = 11000;
        throw duplicate;
      }
      acceptedRequest = input.requestId;
      current.status = input.target;
      current.statusHistory.push({ from: input.source, to: input.target, actorId: id(input.actorId), operationKey: input.operationKey, at: input.now });
      return current;
    },
  };
  const service = createRequestService({ repository });
  const outcomes = await Promise.allSettled([
    service.transition("650000000000000000000001", "request-a", "ACCEPTED", "accept-request-a"),
    service.transition("650000000000000000000001", "request-b", "ACCEPTED", "accept-request-b"),
  ]);
  assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 1);
  const rejected = outcomes.find((outcome) => outcome.status === "rejected");
  assert.equal(rejected.reason.code, "REQUEST_SLOT_CONFLICT");
  assert.equal([...requests.values()].filter((request) => request.status === "ACCEPTED").length, 1);
});

test("a simultaneous retry with the same operation key is idempotent", async () => {
  const record = requestRecord();
  const repository = {
    async findById() { return record; },
    async transition(input) {
      await new Promise((resolve) => setImmediate(resolve));
      if (record.status !== input.source) return null;
      record.status = input.target;
      record.statusHistory.push({ from: input.source, to: input.target, actorId: id(input.actorId), operationKey: input.operationKey, at: input.now });
      return record;
    },
  };
  const service = createRequestService({ repository });
  const [first, retry] = await Promise.all([
    service.transition("650000000000000000000001", "request", "ACCEPTED", "same-accept-operation"),
    service.transition("650000000000000000000001", "request", "ACCEPTED", "same-accept-operation"),
  ]);
  assert.equal(first.request.status, "ACCEPTED");
  assert.equal(retry.request.status, "ACCEPTED");
  assert.equal(record.statusHistory.length, 1);
  assert.equal([first.replayed, retry.replayed].filter(Boolean).length, 1);
});
