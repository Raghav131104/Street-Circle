# Phase 1 Learning Note: Quality and Application Seams

## What and why

The Express application is now created independently from the network listener. `createApp()` assembles middleware and routes; `startServer()` owns configuration, the HTTP listener, signals, and dependency shutdown. This seam exists so integration tests can create the API on an ephemeral port without starting the production process or requiring its database.

The request flow is now request ID → structured logger → security headers/CORS/body limit/rate limit → route → stable not-found/error middleware. Controllers and domain services will enter this flow in later phases. The client has one environment-configured Axios instance rather than multiple hardcoded URLs.

## Internal flow and architecture connection

`src/server.js` validates environment input with Zod, creates Pino, injects readiness, builds the app, and listens. `src/app.js` has no `listen()` call. Pino HTTP creates or validates a correlation ID, adds it to the response, records request duration, and redacts known secret fields. The error boundary converts internal failures to a stable public `{ error: { code, message, requestId } }` DTO.

This is the HLD API-process boundary and the first LLD cross-cutting layer. It prepares controllers/services that do not import `req`/`res`. Health answers whether the process is alive; readiness answers whether it can serve dependency-backed work.

## Decisions and trade-offs

- JavaScript plus Zod was selected per the explicit project constraint. JavaScript executes directly; its dynamic values require runtime validation. TypeScript would improve compile-time refactoring but would still not validate HTTP/environment input.
- Pino was selected for low-overhead JSON logs. Plain `console` is simpler but lacks consistent fields/redaction; hosted APM is unnecessary locally.
- A process-local rate limiter is sufficient for one instance. It resets on restart and cannot coordinate instances; Redis-backed coordination becomes relevant only after multiple instances or measured abuse requires shared state.
- Liveness does not query the database; readiness does. Coupling liveness to a dependency could cause a supervisor to restart a healthy process during a database outage.
- Legacy MySQL routes are temporarily mounted to preserve the existing UI. They remain insecure and are clearly transitional; Phase 2/3 removes them.

## Security and performance

Helmet adds defensive headers, CORS is an explicit allow-list, JSON is limited to 256 KB, request IDs are constrained before reflection, and logs redact cookies/authorization/password-shaped fields. These controls reduce exposure but do not replace authentication or resource authorization. Middleware adds bounded per-request work; structured logging and security headers are small compared with database/network latency and will be measured later.

## Local limitation and production evolution

Local implementation → one Express process with Pino and in-memory limits → provides traceable, bounded requests → loses limit state and local logs across machines → alternatives are shared rate-limit storage and centralized observability → migrate when the app runs multiple instances or incident diagnosis requires cross-machine history.

## Interview questions

1. Why separate `app` from `server`? To isolate HTTP composition from process lifecycle and make integration tests cheap and deterministic.
2. Health versus readiness? Health proves the process loop responds; readiness proves required dependencies can serve work.
3. Why validate environment variables? They are external runtime input; failing at startup is clearer than failing on the first request.
4. What does a request ID solve? It correlates the public failure response with internal logs across middleware and dependencies.
5. Why stable error codes? Clients can branch on durable machine contracts while human messages evolve.

Skeptical follow-ups:

1. Does redaction guarantee no sensitive logs? No. It covers known paths; code review/tests must prevent arbitrary sensitive values from being logged.
2. Is an in-memory rate limiter secure at scale? Only for a single process. Multiple instances require coordinated state and careful proxy/client-IP configuration.
