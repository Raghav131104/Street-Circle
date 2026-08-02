function createNotificationController(service) {
  return {
    async list(req, res) { res.json(await service.list(req.auth.userId, req.validated.query)); },
    async unreadCount(req, res) { res.json({ unreadCount: await service.unreadCount(req.auth.userId) }); },
    async markOne(req, res) { res.json({ notification: await service.markOne(req.auth.userId, req.validated.params.notificationId) }); },
    async markAll(req, res) { res.json(await service.markAll(req.auth.userId)); },
  };
}

module.exports = { createNotificationController };
