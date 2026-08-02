const { randomUUID } = require("node:crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const { rateLimit } = require("express-rate-limit");
const { AppError } = require("./shared/errors/AppError");
const { errorHandler, notFoundHandler } = require("./shared/middleware/errorHandler");
const { createAuthService } = require("./modules/auth/auth.service");
const { createAuthController } = require("./modules/auth/auth.controller");
const { createAuthRouter } = require("./modules/auth/auth.routes");
const { attachAuthentication, requireTrustedOrigin } = require("./modules/auth/auth.middleware");
const { createCommunityService } = require("./modules/communities/community.service");
const { createCommunityController } = require("./modules/communities/community.controller");
const { createCommunityRouter } = require("./modules/communities/community.routes");
const { createListingService } = require("./modules/listings/listing.service");
const { createListingController } = require("./modules/listings/listing.controller");
const { createListingRouter } = require("./modules/listings/listing.routes");
const { createListingMediaService } = require("./modules/listings/listing-media.service");
const { createListingMediaController } = require("./modules/listings/listing-media.controller");
const { createMediaRouter } = require("./modules/listings/media.routes");
const { LocalMediaStore } = require("./infrastructure/local-storage/local-media-store");
const { createRequestService } = require("./modules/requests/request.service");
const { createRequestController } = require("./modules/requests/request.controller");
const { createRequestRouter } = require("./modules/requests/request.routes");
const { createNotificationService } = require("./modules/notifications/notification.service");
const { createNotificationController } = require("./modules/notifications/notification.controller");
const { createNotificationRouter } = require("./modules/notifications/notification.routes");
const { createAuditService } = require("./modules/moderation/audit.service");
const { createMetrics, requireLoopback } = require("./shared/metrics/metrics");
const { safeRequestSerializer } = require("./shared/logging/logger");

function createApp({ config, logger, readiness, legacyRouter, services = {} }) {
  const app = express();
  const authService = createAuthService();
  const auditService = services.audit || createAuditService({ logger });
  const notificationService = services.notification || createNotificationService();
  const communityService = createCommunityService({ notificationService, auditService });
  const mediaStore = new LocalMediaStore(config.mediaRoot);
  const listingService = createListingService({ mediaStore, auditService });
  const listingMediaService = createListingMediaService({ mediaStore });
  const listingMediaController = createListingMediaController(listingMediaService);
  const requestService = services.request || createRequestService({ notificationService, auditService });
  const metrics = services.metrics || createMetrics();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(pinoHttp({
    logger,
    genReqId(req, res) {
      const incoming = req.headers["x-request-id"];
      const requestId = typeof incoming === "string" && /^[a-zA-Z0-9._-]{1,100}$/.test(incoming)
        ? incoming
        : randomUUID();
      res.setHeader("x-request-id", requestId);
      return requestId;
    },
    customProps: (req) => ({ requestId: req.id }),
    serializers: {
      req: safeRequestSerializer,
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }));
  app.use(metrics.middleware);
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
      return callback(new AppError({ code: "ORIGIN_NOT_ALLOWED", message: "Origin is not allowed", status: 403 }));
    },
  }));
  app.use(express.json({ limit: "256kb" }));
  app.use(rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: (req) => req.path === "/health" || req.path === "/ready",
  }));
  app.use(attachAuthentication({ authService, config }));
  app.use(requireTrustedOrigin(config));

  app.get("/api/v1/health", (_req, res) => {
    res.json({ status: "ok", service: "streetcircle-api" });
  });

  app.get("/api/v1/ready", async (_req, res, next) => {
    try {
      const databaseReady = await readiness.isDatabaseReady();
      if (!databaseReady) {
        throw new AppError({ code: "DATABASE_UNAVAILABLE", message: "Database is unavailable", status: 503 });
      }
      res.json({ status: "ready", database: readiness.databaseName });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError({
        code: "DATABASE_UNAVAILABLE",
        message: "Database is unavailable",
        status: 503,
        cause: error,
      }));
    }
  });

  app.get("/api/v1/metrics", requireLoopback, (_req, res) => {
    res.json(metrics.snapshot());
  });

  if (legacyRouter) app.use("/api", legacyRouter);
  app.use("/api/v1/auth", createAuthRouter(createAuthController({ authService, config })));
  app.use("/api/v1/communities", createCommunityRouter(createCommunityController(communityService)));
  app.use("/api/v1/listings", createListingRouter(createListingController(listingService), listingMediaController));
  app.use("/api/v1/media", createMediaRouter(listingMediaController));
  app.use("/api/v1/requests", createRequestRouter(createRequestController(requestService)));
  app.use("/api/v1/notifications", createNotificationRouter(createNotificationController(notificationService)));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
