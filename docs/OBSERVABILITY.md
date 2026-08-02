# Local Observability and Reliability

StreetCircle uses Pino JSON logs, one validated/generated request ID per HTTP request, stable public error codes, health/readiness endpoints, low-cardinality local metrics, audit events, database lifecycle logging, and graceful shutdown. No paid monitoring service is required.

## Endpoints

- `GET /api/v1/health`: liveness only; it does not touch MongoDB.
- `GET /api/v1/ready`: readiness; returns `503 DATABASE_UNAVAILABLE` if the database is not connected.
- `GET /api/v1/metrics`: loopback-only JSON with HTTP totals/status classes/durations, process CPU/memory, uptime, and event-loop delay.

Metrics intentionally do not label user IDs, listing IDs, raw URLs, or other high-cardinality values. The endpoint is suitable for local diagnosis, not public production exposure. A production deployment should place it on an authenticated internal listener and let Prometheus/OpenTelemetry or a hosted equivalent scrape it.

## Logging and privacy

Logs include request ID, method, path without query string, status, and duration. Removing query strings prevents nearby-search coordinates from entering logs. Authorization headers, cookies, passwords, password hashes, and session secrets are redacted. Application code must not log private messages or exact home/listing coordinates.

An API error response contains the same `requestId` as its JSON log, allowing a developer to trace the request locally. Unknown failures return `INTERNAL_ERROR`; internal stack/cause details remain in server logs rather than leaking to clients.

## Audit and shutdown

Authentication, community/membership moderation, listing mutation/removal, request creation/transition/expiry actions persist structured audit events. Metadata contains identifiers, state names, and changed field names—not credentials or content. Audit persistence is best-effort in the local MCT: an audit failure is itself logged but does not make a completed mutation appear failed. A compliance-grade production design should use an atomic outbox or transaction and a durable audit sink.

On `SIGINT`/`SIGTERM`, the server stops the expiry worker, calls `server.close()` to stop accepting connections and wait for active work, closes MongoDB, and forces exit after 10 seconds only if shutdown hangs. The coordinator is idempotent and unit-tested with a real local HTTP server.

## Evolution triggers

Centralized logs become justified when there is more than one process or local files cannot reconstruct incidents. Hosted metrics/APM becomes justified when latency/error SLOs require alerting and historical correlation. Managed secrets become necessary before deploying beyond a developer machine. Replicas/load balancing require stateless media storage and measured availability/throughput needs; none are implemented or claimed here.
