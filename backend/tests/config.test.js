const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadEnv } = require("../src/config/env");

test("loadEnv parses validated defaults and an origin allow-list", () => {
  const config = loadEnv({
    CLIENT_ORIGINS: "http://localhost:5173, http://127.0.0.1:5173",
    MONGODB_URI: "mongodb://localhost/streetcircle_dev",
    MONGODB_TEST_URI: "mongodb://localhost/streetcircle_test",
  });
  assert.equal(config.PORT, 5005);
  assert.deepEqual(config.clientOrigins, ["http://localhost:5173", "http://127.0.0.1:5173"]);
});

test("loadEnv fails with a clear startup error for an invalid port", () => {
  assert.throws(() => loadEnv({
    PORT: "70000",
    MONGODB_URI: "mongodb://localhost/dev",
    MONGODB_TEST_URI: "mongodb://localhost/test",
  }), /Invalid startup configuration: PORT:/);
});

test("test mode always selects the isolated test database URI", () => {
  const config = loadEnv({
    NODE_ENV: "test",
    MONGODB_URI: "mongodb://localhost/streetcircle_dev",
    MONGODB_TEST_URI: "mongodb://localhost/streetcircle_test",
  });
  assert.equal(config.databaseUri, "mongodb://localhost/streetcircle_test");
});
