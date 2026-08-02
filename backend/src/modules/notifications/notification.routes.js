const express = require("express");
const { validate } = require("../../shared/validation/validate");
const { requireAuthentication } = require("../auth/auth.middleware");
const { notificationParamsSchema, notificationQuerySchema } = require("./notification.schemas");

function createNotificationRouter(controller) {
  const router = express.Router();
  router.use(requireAuthentication);
  router.get("/", validate(notificationQuerySchema, "query"), controller.list);
  router.get("/unread-count", controller.unreadCount);
  router.patch("/read-all", controller.markAll);
  router.patch("/:notificationId/read", validate(notificationParamsSchema, "params"), controller.markOne);
  return router;
}

module.exports = { createNotificationRouter };
