const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { EJSON } = require(path.join(__dirname, "..", "backend", "node_modules", "bson"));
const { connectDevelopmentDatabase } = require("./database-runtime");

async function main() {
  const directory = process.argv[2] ? path.resolve(process.argv[2]) : null;
  if (!directory) throw new Error("Usage: npm run db:restore -- <backup-directory>");
  if (process.env.ALLOW_RESTORE !== "streetcircle_dev") {
    throw new Error("Set ALLOW_RESTORE=streetcircle_dev to acknowledge replacement of development data");
  }
  const manifest = EJSON.parse(await fs.readFile(path.join(directory, "manifest.ejson"), "utf8"));
  if (manifest.database !== "streetcircle_dev") throw new Error("Backup is not from streetcircle_dev");
  const connection = await connectDevelopmentDatabase();

  for (const [name, metadata] of Object.entries(manifest.collections)) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) throw new Error(`Unsafe collection name: ${name}`);
    const content = await fs.readFile(path.join(directory, metadata.file), "utf8");
    const checksum = crypto.createHash("sha256").update(content).digest("hex");
    if (checksum !== metadata.sha256) throw new Error(`Checksum mismatch for ${name}`);
    const documents = EJSON.parse(content);
    const collection = connection.db.collection(name);
    await collection.deleteMany({});
    if (documents.length) await collection.insertMany(documents, { ordered: true });
  }
  console.log(`Restored streetcircle_dev from ${directory}`);
  await connection.close();
}

main().catch((error) => { console.error(`Restore failed: ${error.name}: ${error.message}`); process.exitCode = 1; });
