// Compatibility entry point. The application and lifecycle now live under src/.
require("./src/server").startServer().catch((error) => {
  console.error("StreetCircle API failed to start", error);
  process.exitCode = 1;
});
