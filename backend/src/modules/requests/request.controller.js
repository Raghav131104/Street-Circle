function createRequestController(service) {
  return {
    async create(req, res) {
      const result = await service.create(
        req.auth.userId, req.validated.body, req.idempotencyKey, { requestId: req.id },
      );
      res.status(result.replayed ? 200 : 201).json(result);
    },
    async get(req, res) {
      res.json({ request: await service.get(req.auth.userId, req.validated.params.requestId) });
    },
    async list(req, res) {
      res.json(await service.list(req.auth.userId, req.validated.query));
    },
    async transition(req, res) {
      const result = await service.transition(
        req.auth.userId,
        req.validated.params.requestId,
        req.validated.body.status,
        req.idempotencyKey,
        { requestId: req.id },
      );
      res.json(result);
    },
  };
}

module.exports = { createRequestController };
