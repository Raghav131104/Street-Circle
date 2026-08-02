const { AppError } = require("../../shared/errors/AppError");
const { idempotencyKey } = require("./request.schemas");

function requireIdempotencyKey(req, _res, next) {
  const parsed = idempotencyKey.safeParse(req.get("Idempotency-Key"));
  if (!parsed.success) {
    return next(new AppError({
      code: "IDEMPOTENCY_KEY_REQUIRED",
      message: "A valid Idempotency-Key header is required",
      status: 400,
    }));
  }
  req.idempotencyKey = parsed.data;
  return next();
}

module.exports = { requireIdempotencyKey };
