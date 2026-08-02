const check = process.argv[2] || "requested";

console.error(`${check} is intentionally unavailable until its renovation phase is implemented and verified.`);
process.exitCode = 1;
