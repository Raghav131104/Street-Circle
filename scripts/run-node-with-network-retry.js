const { spawn } = require("node:child_process");
const path = require("node:path");

const script = process.argv[2];
if (!script) throw new Error("A Node script path is required");
const absoluteScript = path.resolve(process.cwd(), script);
const transientPattern = /MongoNetworkError|MongoServerSelectionError|SSL alert|tlsv1 alert|ETIMEDOUT|ECONNRESET|connection (?:attempt|failed)/i;

function runOnce() {
  return new Promise((resolve) => {
    let combined = "";
    const child = spawn(process.execPath, [absoluteScript], { cwd: process.cwd(), env: process.env });
    child.stdout.on("data", (chunk) => { const text = chunk.toString(); combined += text; process.stdout.write(text); });
    child.stderr.on("data", (chunk) => { const text = chunk.toString(); combined += text; process.stderr.write(text); });
    child.on("error", (error) => resolve({ code: 1, combined: `${combined}\n${error.message}` }));
    child.on("exit", (code) => resolve({ code: code ?? 1, combined }));
  });
}

async function main() {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await runOnce();
    if (result.code === 0) return;
    const transient = transientPattern.test(result.combined) && !/AssertionError|ERR_ASSERTION/.test(result.combined);
    if (!transient || attempt === 2) {
      process.exitCode = result.code;
      return;
    }
    console.warn(`Transient Atlas/network failure; retrying the isolated verifier (${attempt}/2).`);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
}

void main();
