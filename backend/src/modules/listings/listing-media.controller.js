const MIME_BY_EXTENSION = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

function createListingMediaController(service) {
  return {
    async upload(req, res) {
      const listing = await service.upload(req.auth.userId, req.validated.params.listingId, req.files);
      res.status(201).json({ listing });
    },
    async remove(req, res) {
      const listing = await service.remove(req.auth.userId, req.validated.params.listingId, req.validated.params.mediaId);
      res.json({ listing });
    },
    async read(req, res) {
      const data = await service.read(req.validated.params.key);
      const extension = req.validated.params.key.split(".").at(-1);
      res.set({
        "Content-Type": MIME_BY_EXTENSION[extension],
        "Content-Length": data.length,
        "Cache-Control": "public, max-age=86400, immutable",
      });
      res.send(data);
    },
  };
}

module.exports = { createListingMediaController };
