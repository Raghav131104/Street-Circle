const express = require("express");
const { validate } = require("../../shared/validation/validate");
const { mediaKeyParamsSchema } = require("./listing.schemas");

function createMediaRouter(controller) {
  const router = express.Router();
  router.get("/:key", validate(mediaKeyParamsSchema, "params"), controller.read);
  return router;
}

module.exports = { createMediaRouter };
