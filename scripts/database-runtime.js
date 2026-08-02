const path = require("node:path");
const dotenv = require(path.join(__dirname, "..", "backend", "node_modules", "dotenv"));
const mongoose = require(path.join(__dirname, "..", "backend", "node_modules", "mongoose"));

dotenv.config({ path: path.join(__dirname, "..", "backend", ".env"), quiet: true });

function requireDevelopmentUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing from backend/.env");
  const databaseName = new URL(uri).pathname.slice(1);
  if (databaseName !== "streetcircle_dev") {
    throw new Error(`Refusing operation: expected streetcircle_dev, received ${databaseName || "no database"}`);
  }
  return uri;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function connectDevelopmentDatabase({ attempts = 3 } = {}) {
  const uri = requireDevelopmentUri();
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const connection = mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 20_000,
      connectTimeoutMS: 20_000,
      socketTimeoutMS: 30_000,
      maxPoolSize: 5,
      family: 4,
    });
    try {
      await connection.asPromise();
      return connection;
    } catch (error) {
      lastError = error;
      await connection.close().catch(() => {});
      if (attempt < attempts) {
        console.warn(`Atlas connection attempt ${attempt}/${attempts} failed; retrying safely.`);
        await delay(attempt * 1_000);
      }
    }
  }
  throw lastError;
}

module.exports = { connectDevelopmentDatabase, requireDevelopmentUri };
