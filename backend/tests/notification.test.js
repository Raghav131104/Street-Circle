const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createNotificationService } = require("../src/modules/notifications/notification.service");

function id(value) { return { toString: () => value }; }
function record(number, overrides = {}) {
  return {
    _id: id(`6500000000000000000000${String(number).padStart(2, "0")}`),
    userId: id("650000000000000000000001"),
    type: "request.created",
    title: "New request",
    body: "A listing request was created.",
    entityType: "request",
    entityId: id("650000000000000000000020"),
    readAt: null,
    createdAt: new Date(`2026-08-0${number}T00:00:00.000Z`),
    ...overrides,
  };
}

test("deduplicated notification creation returns one durable record", async () => {
  let stored;
  const repository = {
    async upsertDeduplicated(input) { stored ||= record(1, { ...input }); return stored; },
  };
  const service = createNotificationService({ repository });
  const input = {
    userId: "user-1", type: "request.created", title: "New request", body: "A request exists.",
    entityType: "request", entityId: "650000000000000000000020", deduplicationKey: "request:20:created",
  };
  const first = await service.create(input);
  const second = await service.create(input);
  assert.equal(first.id, second.id);
});

test("notification list is bounded and emits a stable next cursor", async () => {
  const records = [record(3), record(2), record(1)];
  const repository = { async list(_userId, _cursor, limit) { return records.slice(0, limit + 1); } };
  const service = createNotificationService({ repository });
  const result = await service.list("user-1", { limit: 2 });
  assert.equal(result.notifications.length, 2);
  assert.ok(result.nextCursor);
  assert.equal(result.notifications[0].deduplicationKey, undefined);
});

test("mark one never exposes another user's notification", async () => {
  const repository = {
    async markOne() { return null; },
    async findForUser() { return null; },
  };
  const service = createNotificationService({ repository });
  await assert.rejects(service.markOne("wrong-user", "650000000000000000000001"), (error) => error.code === "NOTIFICATION_NOT_FOUND" && error.status === 404);
});

test("mark one is idempotent when the user's notification is already read", async () => {
  const existing = record(1, { readAt: new Date("2026-08-02T00:00:00.000Z") });
  const repository = {
    async markOne() { return null; },
    async findForUser() { return existing; },
  };
  const service = createNotificationService({ repository });
  assert.equal((await service.markOne("user", "id")).readAt.toISOString(), "2026-08-02T00:00:00.000Z");
});

test("mark all returns the actual modified unread count", async () => {
  const service = createNotificationService({ repository: { async markAll() { return { modifiedCount: 4 }; } } });
  assert.deepEqual(await service.markAll("user"), { updatedCount: 4 });
});
