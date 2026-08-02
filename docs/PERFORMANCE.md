# Local Performance Evidence

## Method

Run `npm run test:load` with `NODE_OPTIONS=--tls-max-v1.2` when required by the current network. The script refuses any database except `streetcircle_test`, removes old records bearing its unique marker, creates two users and one community, inserts 1,000 nearby listings, starts the real Express application on an ephemeral local port, runs four bounded HTTP workloads, writes `project-data/performance/latest.json`, and removes only its marker-scoped fixture.

The API server, load generator, and metrics collector run in the same Node process. That makes the test easy to reproduce locally but means CPU, RSS, and event-loop measurements include both client and server work. Atlas network latency is included. These numbers are evidence for this machine and topology, not a production capacity claim.

## Environment and data volume

- Measured: 2026-08-02 IST (`2026-08-01T22:45:09.227Z`).
- Node.js 24.14.1, Windows x64.
- Intel Core i3-1215U, 8 logical CPUs, 7.73 GB RAM.
- MongoDB Atlas M0, Mumbai region, isolated `streetcircle_test` database.
- 1,000 geospatial listing documents, two users, one community, two active memberships.
- Warm-up: one nearby feed and one login request; measured workload followed immediately.

## Results

| Workload | Requests | Concurrency | p50 | p95 | p99 | Throughput | Errors | CPU | RSS delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Nearby listing feed | 50 | 10 | 166.62 ms | 204.15 ms | 888.57 ms | 54.63 req/s | 0% | 1,172 ms | +3.69 MB |
| Login | 8 | 2 | 682.11 ms | 1,040.87 ms | 1,040.87 ms | 2.85 req/s | 0% | 2,516 ms | +0.75 MB |
| Listing creation | 20 | 5 | 165.94 ms | 312.50 ms | 322.90 ms | 24.02 req/s | 0% | 672 ms | +5.00 MB |
| Request creation | 20 | 5 | 249.43 ms | 475.15 ms | 476.08 ms | 15.62 req/s | 0% | 734 ms | +1.32 MB |

Whole-run event-loop delay was 48.76 ms mean, 207.36 ms p95, 249.95 ms p99, and 293.08 ms maximum. The nearby p99 is one outlier in a deliberately small 50-request sample and must not be presented as a stable service-level objective.

## Query plans

`npm run db:explain` records two development query patterns:

- Community/category feed: `IXSCAN` on `ix_listings_community_feed`; 1 key and 1 document examined to return 1 seeded document.
- Nearby feed: `GEO_NEAR_2DSPHERE`/`IXSCAN` on `geo_listings_location`; 13 keys and 2 documents examined to return 1 seeded document.

The API uses projection-sized DTOs, a maximum page size of 50, cursor pagination, and MongoDB `$geoNear`; it does not load all listings into Node to calculate distances.

## Diagnosis and decision

Login is the most CPU-heavy operation because bcrypt deliberately performs expensive password verification. Lowering the cost factor or caching password results would weaken security, so no optimization was made. The feed and write paths produced zero errors and no measured index bottleneck at this dataset size. Optimizing without a diagnosed constraint would create an invented improvement claim.

The next useful experiment is a longer run from a separate load-generator process with 10k/100k listings, repeated samples, server-only CPU/RSS telemetry, and a stable wired network. A migration or optimization is justified when a defined target—such as p95 latency, sustained throughput, error rate, CPU saturation, Atlas connection usage, or working-set memory—is repeatedly missed.

## Limitations and evolution

Atlas M0 has shared-resource and connection limits, and the current campus network intermittently produces TLS/port timeouts. Local disk media prevents horizontal API replication without shared storage. A production evolution could introduce a larger/replicated database tier, object storage plus CDN, centralized metrics, and multiple stateless API instances only after measurements justify their cost. Redis, Kafka, microservices, Kubernetes, and caching are not implemented or claimed.
