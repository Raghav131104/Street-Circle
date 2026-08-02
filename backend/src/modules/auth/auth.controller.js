const { clearSessionCookie, sessionCookie } = require("./auth.cookies");

function context(req) {
  return { requestId: req.id, userAgent: req.headers["user-agent"] };
}

function createAuthController({ authService, config }) {
  return {
    async register(req, res) {
      const result = await authService.register(req.validated.body, context(req), config);
      res.setHeader("Set-Cookie", sessionCookie(result.session.secret, config, result.session.expiresAt));
      res.status(201).json({ user: result.user });
    },
    async login(req, res) {
      const result = await authService.login(req.validated.body, context(req), config);
      res.setHeader("Set-Cookie", sessionCookie(result.session.secret, config, result.session.expiresAt));
      res.json({ user: result.user });
    },
    async logout(req, res) {
      await authService.logout(req.auth?.session, context(req));
      res.setHeader("Set-Cookie", clearSessionCookie(config));
      res.status(204).end();
    },
    me(req, res) { res.json({ user: authService.toUserDto(req.auth.user) }); },
  };
}

module.exports = { createAuthController };
