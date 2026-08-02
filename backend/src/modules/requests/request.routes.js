const express = require("express");
const { validate } = require("../../shared/validation/validate");
const { requireAuthentication } = require("../auth/auth.middleware");
const { requireIdempotencyKey } = require("./request.middleware");
const { createRequestSchema, requestParamsSchema, requestQuerySchema, transitionRequestSchema } = require("./request.schemas");

function createRequestRouter(controller) {
  const router = express.Router();
  router.use(requireAuthentication);
  router.get("/", validate(requestQuerySchema, "query"), controller.list);
  router.post("/", requireIdempotencyKey, validate(createRequestSchema), controller.create);
  router.get("/:requestId", validate(requestParamsSchema, "params"), controller.get);
  router.patch("/:requestId/status", requireIdempotencyKey, validate(requestParamsSchema, "params"), validate(transitionRequestSchema), controller.transition);
  return router;
}

module.exports = { createRequestRouter };
