# Phase 10 Learning Note: Measurement Before Optimization

## Definition, internal flow, and architecture

Performance engineering defines a workload, records latency distributions and resource use, diagnoses the limiting component, changes one justified variable, and measures again. A percentile answers “how slow were the slowest X% of operations”; throughput answers “how much work completed per unit time.” Averages alone hide tail latency.

StreetCircle seeds 1,000 bounded test listings, starts the modular monolith, drives real HTTP requests through middleware/controllers/services/repositories into Atlas, records every end-to-end duration, and computes p50/p95/p99 after sorting the samples (`O(n log n)` time and `O(n)` memory per workload). Worker concurrency is bounded. MongoDB performs spherical lookup through a `2dsphere` index; cursor pagination bounds result work and payload size.

## Security, database, and trade-offs

The login measurement includes session creation and bcrypt verification. Its higher CPU/latency is an intentional offline-password-attack defense. Results never contain credentials, cookies, or exact private user locations. Marker-scoped cleanup and a hard assertion on `streetcircle_test` protect unrelated data.

A k6 or Artillery process would isolate the generator and offer richer scenarios, but adds installation and orchestration cost. The small Node harness uses the same runtime and is easier for a fresher to explain; its combined client/server resource metrics are the main limitation. Migrate to k6 plus separate host metrics when repeated tests, distributed generation, or CI regression thresholds become requirements.

Local implementation -> reproducible evidence for four critical endpoints -> one-machine/Atlas-network limitation -> k6, dedicated telemetry, and production-like datasets -> better isolation at higher setup cost -> migrate when performance becomes a release SLO rather than an interview evidence exercise.

## Likely interviewer questions

1. Why report percentiles? They expose tail behavior hidden by a mean.
2. Why was login slower? Bcrypt is CPU-bound by design and each successful login also persists a session/audit event.
3. Why no cache? No repeated read bottleneck was measured, and cache invalidation would add correctness/security complexity.
4. How does the geospatial index help? MongoDB searches spherical index cells instead of scanning every listing and running Haversine in Node.
5. Are these scalability claims? No; they are reproducible results for one dataset, machine, concurrency, and Atlas tier.

Skeptical follow-ups: Is a 50-request p99 reliable? No, it is a single maximum-like observation and is labeled accordingly. Why not reduce bcrypt rounds? That would optimize by weakening the threat model; adjust only if a measured target and security review justify a different cost.
