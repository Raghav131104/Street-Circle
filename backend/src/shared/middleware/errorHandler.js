const { AppError } = require("../errors/AppError");

function notFoundHandler(req, _res, next) {
  next(new AppError({
    code: "ROUTE_NOT_FOUND",
    message: "Route not found",
    status: 404,
    details: { method: req.method, path: req.path },
  }));
}

function errorHandler(error, req, res, _next) {
  const known = error instanceof AppError;
  const status = known ? error.status : 500;
  const code = known ? error.code : "INTERNAL_ERROR";
  const message = known ? error.message : "An unexpected error occurred";

  req.log?.[status >= 500 ? "error" : "warn"]({
    err: error,
    code,
    requestId: req.id,
  }, message);

  res.status(status).json({
    error: {
      code,
      message,
      ...(known && error.details ? { details: error.details } : {}),
      requestId: req.id,
    },
  });
}

module.exports = { errorHandler, notFoundHandler };
