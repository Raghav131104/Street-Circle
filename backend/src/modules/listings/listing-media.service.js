const { AppError } = require("../../shared/errors/AppError");
const { assertCanManageListing } = require("./listing.policy");
const { listingDto } = require("./listing.service");
const { listingRepository } = require("./listing.repository");

function createListingMediaService({ repository = listingRepository, mediaStore }) {
  async function authorizedListing(actorId, listingId) {
    const listing = await repository.findById(listingId);
    if (!listing || listing.status === "removed") {
      throw new AppError({ code: "LISTING_NOT_FOUND", message: "Listing not found", status: 404 });
    }
    assertCanManageListing(actorId, listing, await repository.findMembership(actorId, listing.communityId));
    return listing;
  }

  return {
    async upload(actorId, listingId, files) {
      if (!files?.length) {
        throw new AppError({ code: "MEDIA_REQUIRED", message: "At least one image is required", status: 400 });
      }
      const listing = await authorizedListing(actorId, listingId);
      if ((listing.media?.length || 0) + files.length > 5) {
        throw new AppError({ code: "MEDIA_LIMIT_EXCEEDED", message: "A listing can have at most five images", status: 409 });
      }

      const saved = [];
      try {
        for (const file of files) saved.push(await mediaStore.save(file.buffer));
        const updated = await repository.appendMedia(listingId, saved);
        if (!updated) {
          throw new AppError({ code: "MEDIA_LIMIT_CONFLICT", message: "The listing media changed concurrently", status: 409 });
        }
        return listingDto(updated);
      } catch (error) {
        await Promise.allSettled(saved.map((item) => mediaStore.remove(item.key)));
        throw error;
      }
    },

    async remove(actorId, listingId, mediaId) {
      const listing = await authorizedListing(actorId, listingId);
      const media = listing.media?.id ? listing.media.id(mediaId) : listing.media?.find((item) => item._id.toString() === mediaId);
      if (!media) throw new AppError({ code: "MEDIA_NOT_FOUND", message: "Media not found", status: 404 });
      const updated = await repository.removeMedia(listingId, mediaId);
      if (!updated) throw new AppError({ code: "MEDIA_STATE_CONFLICT", message: "Media was already removed", status: 409 });
      await mediaStore.remove(media.key);
      return listingDto(updated);
    },

    async read(key) {
      return mediaStore.read(key);
    },
  };
}

module.exports = { createListingMediaService };
