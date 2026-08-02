const express = require("express");
const { z } = require("zod");
const { validate } = require("../../shared/validation/validate");
const { requireAuthentication } = require("../auth/auth.middleware");
const { createCommunitySchema, membershipDecisionSchema, membershipListSchema, objectId } = require("./community.schemas");

function createCommunityRouter(controller) {
  const router = express.Router();
  const communityParams = z.object({ communityId: objectId });
  const membershipParams = z.object({ communityId: objectId, membershipId: objectId });
  router.get("/", controller.list);
  router.get("/mine", requireAuthentication, controller.listMine);
  router.post("/", requireAuthentication, validate(createCommunitySchema), controller.create);
  router.get("/:communityId", validate(communityParams, "params"), controller.get);
  router.get("/:communityId/memberships", requireAuthentication, validate(communityParams, "params"), validate(membershipListSchema, "query"), controller.listMemberships);
  router.post("/:communityId/memberships", requireAuthentication, validate(communityParams, "params"), controller.requestMembership);
  router.patch(
    "/:communityId/memberships/:membershipId", requireAuthentication,
    validate(membershipParams, "params"), validate(membershipDecisionSchema), controller.decideMembership,
  );
  router.delete("/:communityId/memberships/me", requireAuthentication, validate(communityParams, "params"), controller.leave);
  return router;
}

module.exports = { createCommunityRouter };
