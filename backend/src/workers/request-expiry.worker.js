function startRequestExpiryWorker({ service, logger, intervalMs = 60_000 }) {
  let running = false;
  const tick = async () => {
    if (running) return 0;
    running = true;
    try {
      const expired = await service.expireDue(new Date(), 100);
      if (expired > 0) logger.info({ expired }, "Expired stale listing requests");
      return expired;
    } catch (error) {
      logger.error({ err: error }, "Request expiry pass failed");
      return 0;
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  void tick();
  return { tick, stop: () => clearInterval(timer) };
}

module.exports = { startRequestExpiryWorker };
