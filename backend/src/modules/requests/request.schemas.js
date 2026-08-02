const { z } = require("zod");
const { PUBLIC_TARGETS } = require("./request.machine");

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier");
const idempotencyKey = z.string().trim().min(8).max(100).regex(/^[a-zA-Z0-9._:-]+$/);
const createRequestSchema = z.object({
  listingId: objectId,
  message: z.string().trim().max(1000).default(""),
}).strict();
const transitionRequestSchema = z.object({ status: z.enum(PUBLIC_TARGETS) }).strict();
const requestParamsSchema = z.object({ requestId: objectId });
const requestQuerySchema = z.object({
  role: z.enum(["requester", "owner"]).default("requester"),
  status: z.enum(["PENDING", "ACCEPTED", "COMPLETED", "REJECTED", "CANCELLED", "EXPIRED"]).optional(),
  cursor: z.string().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

module.exports = { createRequestSchema, idempotencyKey, requestParamsSchema, requestQuerySchema, transitionRequestSchema };
