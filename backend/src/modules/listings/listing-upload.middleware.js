const multer = require("multer");
const { AppError } = require("../../shared/errors/AppError");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 0, parts: 5 },
});

function parseListingImages(req, res, next) {
  upload.array("files", 5)(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const isSize = error.code === "LIMIT_FILE_SIZE";
      return next(new AppError({
        code: isSize ? "MEDIA_TOO_LARGE" : "INVALID_MEDIA_UPLOAD",
        message: isSize ? "Each image must be 5 MB or smaller" : "The media upload is invalid",
        status: 400,
        details: { reason: error.code },
      }));
    }
    return next(error);
  });
}

module.exports = { parseListingImages };
