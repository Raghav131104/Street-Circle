const { AppError } = require("../../shared/errors/AppError");
const { parseCookies } = require("./auth.cookies");

function attachAuthentication({ authService, config }) {
  return async (req, _res, next) => {
    const secret = parseCookies(req.headers.cookie)[config.SESSION_COOKIE_NAME];
    const authenticated = await authService.authenticate(secret);
    if (authenticated) {
      req.auth = { userId: authenticated.user._id.toString(), user: authenticated.user, session: authenticated.session };
    }
    next();
  };
}

function requireAuthentication(req, _res, next) {
  if (!req.auth) return next(new AppError({ code: "AUTHENTICATION_REQUIRED", message: "Authentication required", status: 401 }));
  return next();
}

function requireTrustedOrigin(config) {
  return (req, _res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const hasSessionCookie = Boolean(parseCookies(req.headers.cookie)[config.SESSION_COOKIE_NAME]);
    if (!hasSessionCookie) return next();
    const origin = req.headers.origin;
    if (typeof origin !== "string" || !config.clientOrigins.includes(origin)) {
      return next(new AppError({ code: "UNTRUSTED_ORIGIN", message: "Request origin is not allowed", status: 403 }));
    }
    return next();
  };
}

module.exports = { attachAuthentication, requireAuthentication, requireTrustedOrigin };
