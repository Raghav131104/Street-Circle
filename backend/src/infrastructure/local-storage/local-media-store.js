const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { AppError } = require("../../shared/errors/AppError");
const { detectImageSignature } = require("./file-signature");

const SAFE_KEY = /^[a-f0-9]{32}\.(?:jpg|png|webp)$/;

class LocalMediaStore {
  constructor(root) {
    this.root = path.resolve(root || path.resolve(__dirname, "../../../..", "project-data/uploads"));
  }

  resolveKey(key) {
    if (!SAFE_KEY.test(key)) {
      throw new AppError({ code: "INVALID_MEDIA_KEY", message: "Invalid media key", status: 400 });
    }
    const resolved = path.resolve(this.root, key);
    if (path.dirname(resolved) !== this.root) {
      throw new AppError({ code: "INVALID_MEDIA_KEY", message: "Invalid media key", status: 400 });
    }
    return resolved;
  }

  async save(buffer) {
    const signature = detectImageSignature(buffer);
    if (!signature) {
      throw new AppError({ code: "UNSUPPORTED_MEDIA_TYPE", message: "Only valid JPEG, PNG, and WebP images are allowed", status: 415 });
    }
    await fs.mkdir(this.root, { recursive: true });
    const key = `${crypto.randomBytes(16).toString("hex")}.${signature.extension}`;
    await fs.writeFile(this.resolveKey(key), buffer, { flag: "wx", mode: 0o600 });
    return {
      key,
      mimeType: signature.mimeType,
      size: buffer.length,
      checksumSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      createdAt: new Date(),
    };
  }

  async read(key) {
    try {
      return await fs.readFile(this.resolveKey(key));
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new AppError({ code: "MEDIA_NOT_FOUND", message: "Media not found", status: 404 });
      }
      throw error;
    }
  }

  async remove(key) {
    try {
      await fs.unlink(this.resolveKey(key));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

module.exports = { LocalMediaStore, SAFE_KEY };
