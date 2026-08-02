const { z } = require("zod");

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier");
const createCommunitySchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(1500),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  coverageRadiusMeters: z.number().int().min(100).max(50_000),
  visibility: z.enum(["public", "private"]).default("public"),
  joinPolicy: z.enum(["open", "approval"]).default("approval"),
  rules: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
}).strict();

const membershipDecisionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["approve", "reject"]) }).strict(),
  z.object({ action: z.literal("change_role"), role: z.enum(["moderator", "member"]) }).strict(),
  z.object({ action: z.literal("block") }).strict(),
]);
const membershipListSchema = z.object({
  status: z.enum(["pending", "active", "rejected", "blocked", "left"]).default("pending"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

module.exports = { createCommunitySchema, membershipDecisionSchema, membershipListSchema, objectId };
