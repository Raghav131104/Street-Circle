const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { EJSON } = require(path.join(__dirname, "..", "backend", "node_modules", "bson"));
const { connectDevelopmentDatabase } = require("./database-runtime");

async function main() {
  const connection = await connectDevelopmentDatabase();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const directory = path.join(__dirname, "..", "project-data", "backups", stamp);
  await fs.mkdir(directory, { recursive: true });
  const collections = await connection.db.listCollections({}, { nameOnly: true }).toArray();
  const manifest = { format: 1, database: connection.name, createdAt: new Date(), collections: {} };

  for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    const documents = await connection.db.collection(name).find({}).toArray();
    const content = EJSON.stringify(documents, { relaxed: false });
    const filename = `${name}.ejson`;
    await fs.writeFile(path.join(directory, filename), content, { encoding: "utf8", flag: "wx" });
    manifest.collections[name] = {
      file: filename,
      count: documents.length,
      sha256: crypto.createHash("sha256").update(content).digest("hex"),
    };
  }
  await fs.writeFile(path.join(directory, "manifest.ejson"), EJSON.stringify(manifest, { relaxed: false }), { flag: "wx" });
  console.log(`Backup created at ${directory}`);
  await connection.close();
}

main().catch((error) => { console.error(`Backup failed: ${error.name}: ${error.message}`); process.exitCode = 1; });
