# Phase 11 Learning Note: Observability and Reliability

## Definition and flow

Observability is the ability to infer system state from outputs such as logs, metrics, and traces. Reliability is the ability to behave predictably during faults and lifecycle changes. A StreetCircle request receives an ID, passes security and domain middleware, updates HTTP metrics on response completion, and emits a structured completion/error log. Sensitive mutations additionally create database audit events.

The HLD places these concerns in shared middleware and the moderation module rather than duplicating them per route. Services receive a small `{ requestId }` context, not an Express request, preserving the LLD boundary. Metric updates are `O(1)` time and memory because they aggregate counters rather than retaining per-request samples.

## Security and trade-offs

Request IDs improve incident correlation but must not encode identity. Query strings are removed because location filters can be private. Low-cardinality metrics avoid unbounded memory and backend cost. Loopback restriction protects process details locally; production should use network policy plus authentication.

Pino was selected over ad-hoc `console.log` because JSON fields are searchable and redaction is centralized. OpenTelemetry/APM would add distributed traces and history, but a single local monolith has no measured need for paid infrastructure. Best-effort audit avoids false 500 responses after committed mutations; an outbox is the evolution when audit completeness becomes a compliance invariant.

Local implementation -> traceable errors and lifecycle evidence -> single-process/no-history limitation -> centralized logs, Prometheus/OpenTelemetry, APM, managed secrets -> more operational power and cost -> migrate when multiple instances, SLO alerting, or regulated audit retention become measured requirements.

## Likely interviewer questions

1. What is the difference between health and readiness? Health says the process lives; readiness says dependencies allow it to serve traffic.
2. Why use request IDs? They correlate a client error with one server log without exposing internals.
3. Why avoid route IDs in metrics? User/entity IDs create unbounded cardinality and memory/storage cost.
4. How does graceful shutdown work? Stop background producers, stop accepting connections, drain active work, close resources, enforce a timeout.
5. Why are audits not normal logs? They are durable domain records with actor/action/entity semantics and retention/query needs.

Skeptical follow-ups: Can best-effort audit lose events? Yes; an atomic outbox is the documented production correction. Is loopback-only metrics enough behind a proxy? No; production must use an internal authenticated listener and explicit trusted-proxy configuration.
