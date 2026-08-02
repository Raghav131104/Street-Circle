const assert = require("node:assert/strict");
const http = require("node:http");
const { test } = require("node:test");
const { createGracefulShutdown } = require("../src/shared/reliability/graceful-shutdown");

test("graceful shutdown stops workers, refuses new work, closes resources, and is idempotent", async () => {
  const server = http.createServer((_req, res) => res.end("ok"));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const events = [];
  const shutdown = createGracefulShutdown({
    server,
    stopWorkers: () => events.push("workers-stopped"),
    closeResources: async () => { events.push("resources-closed"); },
    logger: { info: () => {}, fatal: () => {} },
    timeoutMs: 1_000,
    forceExit: () => events.push("forced"),
  });

  const first = shutdown("SIGTERM");
  const second = shutdown("SIGINT");
  assert.equal(first, second);
  await first;
  assert.deepEqual(events, ["workers-stopped", "resources-closed"]);
  await assert.rejects(fetch(`http://127.0.0.1:${address.port}`));
});
