require("dotenv").config();
const http = require("node:http");
const { loadEnv } = require("./config/env");
const { createLogger } = require("./shared/logging/logger");
const { createApp } = require("./app");
const { connectDatabase, disconnectDatabase, isDatabaseReady } = require("./infrastructure/database/connection");
const { syncIndexes } = require("./infrastructure/database/models");
const { createRequestService } = require("./modules/requests/request.service");
const { startRequestExpiryWorker } = require("./workers/request-expiry.worker");
const { createNotificationService } = require("./modules/notifications/notification.service");
const { createAuditService } = require("./modules/moderation/audit.service");
const { createGracefulShutdown } = require("./shared/reliability/graceful-shutdown");

async function startServer() {
  const config = loadEnv();
  const logger = createLogger({ level: config.LOG_LEVEL });
  const connection = await connectDatabase(config.databaseUri, logger);
  await syncIndexes();
  const readiness = {
    get databaseName() { return connection.name; },
    async isDatabaseReady() { return isDatabaseReady(); },
  };
  const notificationService = createNotificationService();
  const auditService = createAuditService({ logger });
  const requestService = createRequestService({ notificationService, auditService });
  const app = createApp({
    config, logger, readiness,
    services: { request: requestService, notification: notificationService, audit: auditService },
  });
  const requestExpiryWorker = startRequestExpiryWorker({ service: requestService, logger });
  const server = http.createServer(app);
  const shutdown = createGracefulShutdown({
    server,
    stopWorkers: () => requestExpiryWorker.stop(),
    closeResources: disconnectDatabase,
    logger,
  });

  const handleSignal = (signal) => {
    void shutdown(signal).catch((error) => {
      logger.error({ err: error, signal }, "Graceful shutdown failed");
      process.exitCode = 1;
    });
  };
  process.once("SIGINT", () => handleSignal("SIGINT"));
  process.once("SIGTERM", () => handleSignal("SIGTERM"));

  server.listen(config.PORT, () => {
    logger.info({ port: config.PORT, environment: config.NODE_ENV }, "StreetCircle API started");
  });

  return { server, shutdown };
}

if (require.main === module) {
  startServer().catch((error) => {
    const logger = createLogger();
    logger.fatal({ err: error }, "StreetCircle API failed to start");
    process.exitCode = 1;
  });
}

module.exports = { startServer };
