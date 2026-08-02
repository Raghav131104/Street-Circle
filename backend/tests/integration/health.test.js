const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createApp } = require("../../src/app");
const { createLogger } = require("../../src/shared/logging/logger");

const config = { clientOrigins: ["http://localhost:5173"] };
const logger = createLogger({ level: "silent" });

async function withServer(readiness, callback) {
  const app = createApp({ config, logger, readiness });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const address = server.address();
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("health is live without touching the database and returns a request ID", async () => {
  await withServer({ databaseName: "test", isDatabaseReady: async () => false }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("x-request-id"), /^[a-zA-Z0-9-]+$/);
    assert.deepEqual(await response.json(), { status: "ok", service: "streetcircle-api" });
  });
});

test("readiness returns a stable 503 response when the database is unavailable", async () => {
  await withServer({ databaseName: "test", isDatabaseReady: async () => false }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/ready`);
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.error.code, "DATABASE_UNAVAILABLE");
    assert.equal(body.error.requestId, response.headers.get("x-request-id"));
  });
});

test("unknown routes use the stable error contract", async () => {
  await withServer({ databaseName: "test", isDatabaseReady: async () => true }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/missing`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, "ROUTE_NOT_FOUND");
  });
});

test("loopback metrics expose bounded process and HTTP aggregates", async () => {
  await withServer({ databaseName: "test", isDatabaseReady: async () => true }, async (baseUrl) => {
    await fetch(`${baseUrl}/api/v1/health`);
    const response = await fetch(`${baseUrl}/api/v1/metrics`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.http.totalRequests, 1);
    assert.equal(body.http.statusClasses["2xx"], 1);
    assert.equal(typeof body.process.rssBytes, "number");
    assert.equal(typeof body.eventLoopDelayMs.p95, "number");
  });
});
