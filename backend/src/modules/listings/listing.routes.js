const express = require("express");
const { validate } = require("../../shared/validation/validate");
const { requireAuthentication } = require("../auth/auth.middleware");
const { createListingSchema, listingMediaParamsSchema, listingParamsSchema, listingQuerySchema, updateListingSchema } = require("./listing.schemas");
const { parseListingImages } = require("./listing-upload.middleware");

function createListingRouter(controller, mediaController) {
  const router = express.Router();
  router.get("/", validate(listingQuerySchema, "query"), controller.list);
  router.post("/", requireAuthentication, validate(createListingSchema), controller.create);
  router.post("/:listingId/media", requireAuthentication, validate(listingParamsSchema, "params"), parseListingImages, mediaController.upload);
  router.delete("/:listingId/media/:mediaId", requireAuthentication, validate(listingMediaParamsSchema, "params"), mediaController.remove);
  router.get("/:listingId", validate(listingParamsSchema, "params"), controller.get);
  router.patch("/:listingId", requireAuthentication, validate(listingParamsSchema, "params"), validate(updateListingSchema), controller.update);
  router.delete("/:listingId", requireAuthentication, validate(listingParamsSchema, "params"), controller.remove);
  return router;
}

module.exports = { createListingRouter };
