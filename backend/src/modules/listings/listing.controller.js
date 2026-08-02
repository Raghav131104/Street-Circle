function createListingController(service) {
  return {
    async create(req, res) {
      res.status(201).json({ listing: await service.create(req.auth.userId, req.validated.body, { requestId: req.id }) });
    },
    async get(req, res) { res.json({ listing: await service.get(req.validated.params.listingId) }); },
    async list(req, res) { res.json(await service.list(req.validated.query)); },
    async update(req, res) {
      res.json({ listing: await service.update(
        req.auth.userId, req.validated.params.listingId, req.validated.body, { requestId: req.id },
      ) });
    },
    async remove(req, res) {
      await service.remove(req.auth.userId, req.validated.params.listingId, { requestId: req.id });
      res.status(204).end();
    },
  };
}

module.exports = { createListingController };
