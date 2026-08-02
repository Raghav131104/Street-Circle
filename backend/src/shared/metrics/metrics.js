const { monitorEventLoopDelay, performance } = require("node:perf_hooks");
const { AppError } = require("../errors/AppError");

function createMetrics() {
  const startedAt = new Date();
  const eventLoop = monitorEventLoopDelay({ resolution: 20 });
  eventLoop.enable();
  const state = {
    totalRequests: 0,
    inFlightRequests: 0,
    errorResponses: 0,
    durationCount: 0,
    durationSumMs: 0,
    durationMaxMs: 0,
    statusClasses: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 },
  };

  function middleware(req, res, next) {
    const started = performance.now();
    state.inFlightRequests += 1;
    let recorded = false;
    function record() {
      if (recorded) return;
      recorded = true;
      const durationMs = performance.now() - started;
      state.inFlightRequests = Math.max(0, state.inFlightRequests - 1);
      state.totalRequests += 1;
      state.durationCount += 1;
      state.durationSumMs += durationMs;
      state.durationMaxMs = Math.max(state.durationMaxMs, durationMs);
      const statusClass = `${Math.floor(res.statusCode / 100)}xx`;
      if (statusClass in state.statusClasses) state.statusClasses[statusClass] += 1;
      if (res.statusCode >= 500) state.errorResponses += 1;
    }
    res.once("finish", record);
    res.once("close", record);
    next();
  }

  function snapshot() {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();
    return {
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Number(process.uptime().toFixed(2)),
      http: {
        ...state,
        durationMeanMs: state.durationCount
          ? Number((state.durationSumMs / state.durationCount).toFixed(2))
          : 0,
        durationSumMs: Number(state.durationSumMs.toFixed(2)),
        durationMaxMs: Number(state.durationMaxMs.toFixed(2)),
      },
      process: {
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
        cpuUserMs: Number((cpu.user / 1_000).toFixed(2)),
        cpuSystemMs: Number((cpu.system / 1_000).toFixed(2)),
      },
      eventLoopDelayMs: {
        mean: Number.isFinite(eventLoop.mean) ? Number((eventLoop.mean / 1e6).toFixed(2)) : 0,
        p95: Number((eventLoop.percentile(95) / 1e6).toFixed(2)),
        p99: Number((eventLoop.percentile(99) / 1e6).toFixed(2)),
        max: Number((eventLoop.max / 1e6).toFixed(2)),
      },
    };
  }

  return { middleware, snapshot };
}

function requireLoopback(req, _res, next) {
  const address = req.socket.remoteAddress;
  if (["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address)) return next();
  return next(new AppError({
    code: "METRICS_LOCAL_ONLY", message: "Metrics are available only from the local machine", status: 403,
  }));
}

module.exports = { createMetrics, requireLoopback };
