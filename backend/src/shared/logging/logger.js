const pino = require("pino");

function safeRequestSerializer(req) {
  return { id: req.id, method: req.method, path: req.url?.split("?", 1)[0] };
}

function createLogger({ level = "info", destination } = {}) {
  return pino({
    level,
    base: { service: "streetcircle-api" },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "headers.authorization",
        "headers.cookie",
        "body.password",
        "body.passwordHash",
        "body.sessionSecret",
        "password",
        "passwordHash",
        "sessionSecret",
      ],
      censor: "[REDACTED]",
    },
  }, destination);
}

module.exports = { createLogger, safeRequestSerializer };
