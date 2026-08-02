function createGracefulShutdown({
  server,
  stopWorkers,
  closeResources,
  logger,
  timeoutMs = 10_000,
  forceExit = (code) => process.exit(code),
}) {
  let shutdownPromise = null;

  return function shutdown(signal) {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      stopWorkers();
      logger.info({ signal }, "Graceful shutdown started");
      const forcedExit = setTimeout(() => {
        logger.fatal("Graceful shutdown timed out");
        forceExit(1);
      }, timeoutMs);
      forcedExit.unref();

      try {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
        await closeResources();
      } finally {
        clearTimeout(forcedExit);
      }
    })();
    return shutdownPromise;
  };
}

module.exports = { createGracefulShutdown };
