const path = require("node:path");
const { connectDevelopmentDatabase } = require("./database-runtime");

async function main() {
  const connection = await connectDevelopmentDatabase();
  await connection.db.admin().command({ ping: 1 });
  console.log(`Atlas ping passed for ${connection.name}.`);
  await connection.close();
}

main().catch((error) => {
  console.error(`Atlas verification failed: ${error.name}. Check cluster status, current-IP access, and credentials.`);
  process.exitCode = 1;
});
