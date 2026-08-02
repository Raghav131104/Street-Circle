import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  outputDir: "../project-data/playwright-results",
  globalSetup: "./e2e/cleanup.js",
  globalTeardown: "./e2e/cleanup.js",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    geolocation: { longitude: 72.8777, latitude: 19.076 },
    permissions: ["geolocation"],
  },
  webServer: [
    {
      command: "npm.cmd start",
      cwd: "../backend",
      url: "http://127.0.0.1:5005/api/v1/health",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...process.env, NODE_ENV: "test", LOG_LEVEL: "info", NODE_OPTIONS: "--tls-max-v1.2" },
    },
    {
      command: "npm.cmd run dev -- --host 127.0.0.1 --port 5173",
      cwd: ".",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...process.env, VITE_API_URL: "http://127.0.0.1:5005/api/v1" },
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
