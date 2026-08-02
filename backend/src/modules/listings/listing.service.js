const { AppError } = require("../../shared/errors/AppError");
const { decodeCursor, encodeCursor } = require("./listing.cursor");
const { assertActiveCommunityMember, assertCanManageListing } = require("./listing.policy");
const { listingRepository } = require("./listing.repository");

function listingDto(listing) {
  return {
    id: listing._id.toString(), authorId: listing.authorId.toString(), communityId: listing.communityId.toString(),
    title: listing.title, description: listing.description, type: listing.type, category: listing.category,
    price: listing.price, location: listing.location,
    media: (listing.media || []).map((item) => ({
      id: item._id.toString(),
      url: `/api/v1/media/${item.key}`,
      mimeType: item.mimeType,
      size: item.size,
      checksumSha256: item.checksumSha256,
      createdAt: item.createdAt,
    })),
    status: listing.status,
    ...(listing.distanceMeters !== undefined ? { distanceMeters: listing.distanceMeters } : {}),
    createdAt: listing.createdAt, updatedAt: listing.updatedAt,
  };
}

function createListingService({ repository = listingRepository, mediaStore = null, auditService = null } = {}) {
  return {
    async create(actorId, input, context = {}) {
      assertActiveCommunityMember(await repository.findMembership(actorId, input.communityId));
      const listing = await repository.create({
        authorId: actorId, communityId: input.communityId, title: input.title,
        description: input.description, type: input.type, category: input.category.toLowerCase(),
        price: input.price, location: { type: "Point", coordinates: [input.longitude, input.latitude] },
        media: [], status: "active",
      });
      await auditService?.record({
        actorId, action: "listing.create", entityType: "listing", entityId: listing._id,
        requestId: context.requestId, metadata: { communityId: input.communityId },
      });
      return listingDto(listing);
    },
    async get(id) {
      const listing = await repository.findById(id);
      if (!listing || listing.status === "removed") throw new AppError({ code: "LISTING_NOT_FOUND", message: "Listing not found", status: 404 });
      return listingDto(listing);
    },
    async list(input) {
      const near = input.longitude !== undefined;
      const cursor = decodeCursor(input.cursor, near ? "near" : "feed");
      const records = await repository.list(input, cursor, input.limit);
      const hasMore = records.length > input.limit;
      const page = records.slice(0, input.limit);
      const last = page.at(-1);
      const nextCursor = hasMore && last ? encodeCursor(near
        ? { distanceMeters: last.distanceMeters, id: last._id.toString() }
        : { createdAt: last.createdAt.toISOString(), id: last._id.toString() }) : null;
      return { listings: page.map(listingDto), nextCursor };
    },
    async update(actorId, id, input, context = {}) {
      const listing = await repository.findById(id);
      if (!listing || listing.status === "removed") throw new AppError({ code: "LISTING_NOT_FOUND", message: "Listing not found", status: 404 });
      const membership = await repository.findMembership(actorId, listing.communityId);
      assertCanManageListing(actorId, listing, membership);
      const changes = { ...input };
      if (input.category) changes.category = input.category.toLowerCase();
      if (input.longitude !== undefined) {
        changes.location = { type: "Point", coordinates: [input.longitude, input.latitude] };
        delete changes.longitude;
        delete changes.latitude;
      }
      const updated = await repository.update(id, changes);
      await auditService?.record({
        actorId, action: "listing.update", entityType: "listing", entityId: updated._id,
        requestId: context.requestId, metadata: { changedFields: Object.keys(input).sort() },
      });
      return listingDto(updated);
    },
    async remove(actorId, id, context = {}) {
      const listing = await repository.findById(id);
      if (!listing || listing.status === "removed") throw new AppError({ code: "LISTING_NOT_FOUND", message: "Listing not found", status: 404 });
      assertCanManageListing(actorId, listing, await repository.findMembership(actorId, listing.communityId));
      await repository.remove(id);
      if (mediaStore) await Promise.all((listing.media || []).map((item) => mediaStore.remove(item.key)));
      await auditService?.record({
        actorId, action: "listing.remove", entityType: "listing", entityId: listing._id,
        requestId: context.requestId, metadata: { communityId: listing.communityId.toString() },
      });
    },
  };
}

module.exports = { createListingService, listingDto };
