const { z } = require("zod");

const notificationParamsSchema = z.object({ notificationId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier") });
const notificationQuerySchema = z.object({
  cursor: z.string().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

module.exports = { notificationParamsSchema, notificationQuerySchema };
