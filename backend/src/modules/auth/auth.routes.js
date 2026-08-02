const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { validate } = require("../../shared/validation/validate");
const { loginSchema, registerSchema } = require("./auth.schemas");
const { requireAuthentication } = require("./auth.middleware");

function createAuthRouter(controller) {
  const router = express.Router();
  const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
  router.post("/register", authLimiter, validate(registerSchema), controller.register);
  router.post("/login", authLimiter, validate(loginSchema), controller.login);
  router.post("/logout", requireAuthentication, controller.logout);
  router.get("/me", requireAuthentication, controller.me);
  return router;
}

module.exports = { createAuthRouter };
