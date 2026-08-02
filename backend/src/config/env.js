const { z } = require("zod");
const path = require("node:path");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5005),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  CLIENT_ORIGINS: z.string().default("http://localhost:5173,http://127.0.0.1:5173"),
  MONGODB_URI: z.string().startsWith("mongodb"),
  MONGODB_TEST_URI: z.string().startsWith("mongodb"),
  SESSION_COOKIE_NAME: z.string().regex(/^[a-zA-Z0-9_-]+$/).default("streetcircle_session"),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(168),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  DUMMY_PASSWORD_HASH: z.string().startsWith("$2").default("$2b$12$C6UzMDM.H6dfI/f/IKcEe.yrY7h9/rU7QqVq.VyGqj8hP6qE9K6Fe"),
  MEDIA_ROOT: z.string().min(1).default("project-data/uploads"),
});

function loadEnv(source = process.env) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid startup configuration: ${details}`);
  }

  const config = {
    ...result.data,
    clientOrigins: result.data.CLIENT_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
    mediaRoot: path.isAbsolute(result.data.MEDIA_ROOT)
      ? result.data.MEDIA_ROOT
      : path.resolve(__dirname, "../../..", result.data.MEDIA_ROOT),
  };
  return { ...config, databaseUri: config.NODE_ENV === "test" ? config.MONGODB_TEST_URI : config.MONGODB_URI };
}

module.exports = { loadEnv };
