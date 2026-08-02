# Scalability Evolution

StreetCircle is a measured local/Atlas M0 modular monolith, not a claimed internet-scale system. The current design is intentionally the simplest architecture that preserves security and domain invariants.

## Current strengths and ceilings

- Stateless HTTP identity lookup is shared through MongoDB sessions, but Atlas latency is paid on authenticated requests.
- Cursor pagination, bounded payloads, projections/DTOs, compound indexes, and a `2dsphere` index avoid unbounded application work.
- One Node process has process-local rate limits/metrics and one expiry worker.
- Local media is fast and free for one host but blocks horizontal replication and must be backed up separately.
- Notifications are durable, but their creation and the initiating mutation are not universally atomic.
- Atlas M0 is shared free infrastructure with connection/storage/availability limits and an internet dependency.

## Evidence-led ladder

1. Measure a defined SLO and resource constraint with larger/repeated datasets.
2. Optimize query shape, index, projection, payload, and hot duplicate calls inside the monolith.
3. Add a bounded cache only for a demonstrated read hotspot and define invalidation/maximum memory.
4. Move media to S3-compatible/object storage plus CDN when multiple API instances or delivery/storage targets require it.
5. Run multiple stateless API instances behind a load balancer; use shared distributed rate limiting/session cache only if MongoDB session latency/abuse measurements justify Redis.
6. Use a MongoDB transactional outbox and worker when notification/audit/job reliability requires guaranteed eventual delivery.
7. Scale the managed database tier/read topology when measured connections, working set, storage, latency, or availability exceed M0.
8. Extract a service only when a module needs independent ownership, deployment cadence, failure isolation, or scaling that exceeds the operational cost of a distributed system.

## Alternatives and triggers

| Alternative | Benefit | Cost/risk | Measurable trigger |
| --- | --- | --- | --- |
| Redis session/cache/rate limit | Shared low-latency state | New availability/invalidation/security burden | Repeated session/query latency or multi-instance abuse limit failure |
| Object storage/CDN | Shared durable media and delivery | Credentials, provider/network/cost | More than one API host, disk/recovery or media latency target missed |
| Queue/local worker | Retryable async work | Eventual consistency, dedup/poison jobs | Synchronous work breaks latency or guaranteed side effects required |
| Paid Atlas tier/replicas | Capacity and availability options | Ongoing cost/provider dependency | M0 documented limits or availability SLO exceeded |
| Microservices | Independent ownership/deploy/scale | Network failures, contracts, tracing, data consistency | Independent team/scale/failure boundary proven |
| Kubernetes | Scheduling/self-healing at fleet scale | High operational complexity | A substantial container fleet and operations team exist |

Kafka, Kubernetes, microservices, paid monitoring, object storage, Redis, and managed queues are not implemented. They are migration options, never resume claims.
