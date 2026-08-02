const { z } = require("zod");

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier");
const listingFields = {
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(3000),
  type: z.enum(["item", "skill"]),
  category: z.string().trim().min(2).max(60).regex(/^[a-zA-Z0-9 _-]+$/),
  price: z.number().min(0).max(1_000_000),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
};

const createListingSchema = z.object({ communityId: objectId, ...listingFields }).strict();
const updateListingSchema = z.object({
  title: listingFields.title.optional(), description: listingFields.description.optional(),
  type: listingFields.type.optional(), category: listingFields.category.optional(),
  price: listingFields.price.optional(), longitude: listingFields.longitude.optional(),
  latitude: listingFields.latitude.optional(),
  status: z.enum(["active", "reserved", "closed"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one field is required")
  .refine((value) => (value.longitude === undefined) === (value.latitude === undefined), "Longitude and latitude must be updated together");

const listingParamsSchema = z.object({ listingId: objectId });
const listingMediaParamsSchema = z.object({ listingId: objectId, mediaId: objectId });
const mediaKeyParamsSchema = z.object({ key: z.string().regex(/^[a-f0-9]{32}\.(?:jpg|png|webp)$/) });
const listingQuerySchema = z.object({
  longitude: z.coerce.number().min(-180).max(180).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  radiusMeters: z.coerce.number().int().min(100).max(50_000).default(10_000),
  communityId: objectId.optional(),
  type: z.enum(["item", "skill"]).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  status: z.enum(["active", "reserved", "closed"]).default("active"),
  search: z.string().trim().min(1).max(100).optional(),
  cursor: z.string().max(300).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict().refine((value) => (value.longitude === undefined) === (value.latitude === undefined), "Longitude and latitude must be supplied together");

module.exports = {
  createListingSchema,
  listingMediaParamsSchema,
  listingParamsSchema,
  listingQuerySchema,
  mediaKeyParamsSchema,
  updateListingSchema,
};
