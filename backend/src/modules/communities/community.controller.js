function createCommunityController(service) {
  return {
    async create(req, res) {
      res.status(201).json({ community: await service.create(req.auth.userId, req.validated.body, { requestId: req.id }) });
    },
    async get(req, res) { res.json({ community: await service.get(req.validated.params.communityId) }); },
    async list(_req, res) { res.json({ communities: await service.list() }); },
    async listMine(req, res) { res.json({ memberships: await service.listMine(req.auth.userId) }); },
    async listMemberships(req, res) {
      res.json({ memberships: await service.listMemberships(req.auth.userId, req.validated.params.communityId, req.validated.query) });
    },
    async requestMembership(req, res) {
      res.status(201).json({ membership: await service.requestMembership(
        req.auth.userId, req.validated.params.communityId, { requestId: req.id },
      ) });
    },
    async decideMembership(req, res) {
      res.json({ membership: await service.decide(
        req.auth.userId, req.validated.params.communityId, req.validated.params.membershipId,
        req.validated.body, { requestId: req.id },
      ) });
    },
    async leave(req, res) {
      res.json({ membership: await service.leave(req.auth.userId, req.validated.params.communityId, { requestId: req.id }) });
    },
  };
}

module.exports = { createCommunityController };
