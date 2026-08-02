const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const { test } = require("node:test");
const { createAuditService } = require("../src/modules/moderation/audit.service");
const { createLogger, safeRequestSerializer } = require("../src/shared/logging/logger");
const { createMetrics } = require("../src/shared/metrics/metrics");

test("request logging strips query strings that may contain precise coordinates", () => {
  assert.deepEqual(
    safeRequestSerializer({ id: "req-1", method: "GET", url: "/api/v1/listings?latitude=19.076&longitude=72.8777" }),
    { id: "req-1", method: "GET", path: "/api/v1/listings" },
  );
});

test("structured logger redacts authentication and password values", async () => {
  const destination = new PassThrough();
  let output = "";
  destination.on("data", (chunk) => { output += chunk.toString(); });
  const logger = createLogger({ level: "info", destination });
  logger.info({
    headers: { authorization: "Bearer private", cookie: "session=private" },
    body: { password: "Password!2026", sessionSecret: "opaque-secret" },
  }, "redaction check");
  await new Promise((resolve) => setImmediate(resolve));
  assert.doesNotMatch(output, /Bearer private|session=private|Password!2026|opaque-secret/);
  assert.match(output, /\[REDACTED\]/);
});

test("metrics aggregate request counts, errors, duration, process, and event-loop data", () => {
  const metrics = createMetrics();
  const response = new EventEmitter();
  response.statusCode = 503;
  let called = false;
  metrics.middleware({}, response, () => { called = true; });
  response.emit("finish");
  const snapshot = metrics.snapshot();
  assert.equal(called, true);
  assert.equal(snapshot.http.totalRequests, 1);
  assert.equal(snapshot.http.inFlightRequests, 0);
  assert.equal(snapshot.http.errorResponses, 1);
  assert.equal(snapshot.http.statusClasses["5xx"], 1);
  assert.equal(typeof snapshot.process.rssBytes, "number");
  assert.equal(typeof snapshot.eventLoopDelayMs.p95, "number");
});

test("audit service records safe structured actions and does not reverse a completed action on audit failure", async () => {
  const payloads = [];
  const recorded = createAuditService({ model: { create: async (payload) => { payloads.push(payload); return payload; } } });
  await recorded.record({ actorId: "actor", action: "listing.remove", entityType: "listing", entityId: "entity", requestId: "req-2" });
  assert.deepEqual(payloads[0].metadata, {});

  let logged = false;
  const unavailable = createAuditService({
    model: { create: async () => { throw new Error("database unavailable"); } },
    logger: { error: () => { logged = true; } },
  });
  assert.equal(await unavailable.record({ action: "request.transition", entityType: "request" }), null);
  assert.equal(logged, true);
});
