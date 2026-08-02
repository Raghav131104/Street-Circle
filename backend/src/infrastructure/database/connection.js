const mongoose = require("mongoose");

const CONNECTION_OPTIONS = Object.freeze({
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 30_000,
  family: 4,
});

async function connectDatabase(uri, logger) {
  if (!uri) throw new Error("MONGODB_URI is required");
  mongoose.connection.on("error", (error) => logger?.error({ err: error }, "MongoDB connection error"));
  mongoose.connection.on("disconnected", () => logger?.warn("MongoDB disconnected"));
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await mongoose.connect(uri, CONNECTION_OPTIONS);
      await mongoose.connection.db.admin().command({ ping: 1 });
      logger?.info({ database: mongoose.connection.name }, "MongoDB connected");
      return mongoose.connection;
    } catch (error) {
      lastError = error;
      await mongoose.disconnect().catch(() => {});
      if (attempt < 3) {
        logger?.warn({ attempt }, "MongoDB connection failed; retrying safely");
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
  }
  throw lastError;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDatabase, disconnectDatabase, isDatabaseReady };
