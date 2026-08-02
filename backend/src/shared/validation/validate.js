const { AppError } = require("../errors/AppError");

function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError({
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        status: 400,
        details: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      }));
    }
    req.validated = req.validated || {};
    req.validated[source] = result.data;
    return next();
  };
}

module.exports = { validate };
