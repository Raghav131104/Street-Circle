# StreetCircle Interview Study Guide

## One-minute explanation

StreetCircle is a neighborhood sharing MCT for organizing trusted local communities and exchanging items and skills. Users create or join communities, discover nearby listings through browser/manual location and 2/5/10 km radius filters, upload validated images, submit availability requests, and receive durable in-app notifications. General member chat and event management are outside the implemented scope; request messages are attached only to listing requests. The system is built as a React/Express/Mongoose modular monolith with secure cookie sessions, role policies, database-backed geospatial discovery, a concurrency-safe booking state machine, structured observability, and automated browser/integration tests. MongoDB Atlas M0 is the selected free database, so internet/IP allow-list availability is an honest limitation.

## Trace one request

1. The React API service sends JSON and the browser's HttpOnly cookie.
2. Express assigns a request ID, applies Helmet/CORS/rate/size controls, validates the Origin, hashes the cookie, and loads session/user state.
3. Zod rejects malformed external input at runtime.
4. The controller translates HTTP into primitive service arguments.
5. The service enforces membership, role, ownership, state, or idempotency rules.
6. A repository/Mongoose model executes a bounded indexed query, conditional update, or transaction.
7. A DTO returns public fields only; Pino logs path/status/duration without secrets or coordinate query strings.

## Concepts to explain

- TypeScript would improve compile-time feedback, but it erases at runtime; Zod protects untrusted input. The current explicit requirement uses JavaScript with an incremental migration boundary.
- An HttpOnly opaque cookie reduces direct token theft by XSS and enables immediate MongoDB revocation; SameSite plus Origin checks mitigate CSRF.
- A MongoDB TTL index cleans expired sessions eventually, but queries still check `expiresAt` because TTL deletion is asynchronous.
- `[longitude, latitude]` is GeoJSON order. `$geoNear` uses the `2dsphere` index instead of loading all records and running Haversine in Node.
- Cursor pagination follows an indexed stable sort and avoids large-offset work/duplicate pages under inserts.
- Request acceptance uses actor/state policy, expected-state conditional updates, idempotency keys, a transaction, and a partial unique index. The database—not frontend timing—is the final race defense.
- Local media verifies bytes, generates random keys, bounds memory/files, stores SHA-256 metadata, and cleans failed writes. It cannot safely scale across multiple hosts.
- Notifications are persisted truth; a future socket would only be a delivery optimization and must recover by fetching MongoDB.
- Metrics are low-cardinality aggregates. Request IDs correlate public errors to JSON logs. Audit events are domain records, not arbitrary console text.

## Honest evidence

The current gates include 51 backend tests, 11 React component tests, 4 offline HTTP integration checks, five live Atlas suites, a Playwright two-user MCT, and a production build. The measured 1,000-listing run had zero errors; quote exact percentile/throughput values only from `docs/PERFORMANCE.md` and include its environment/sample limitations.

## Discussion ladder

For every feature answer in this order:

`local implementation -> requirement addressed -> limitation -> alternatives -> trade-offs -> measurable migration trigger`

Example: local disk meets free single-host media storage; it cannot support multiple stateless API instances; GridFS/object storage are alternatives; they add database load or provider cost; migrate when topology, recovery, capacity, or measured latency requires it.

## Questions to rehearse

1. Why modular monolith instead of microservices?
2. How is client impersonation prevented?
3. Where is authorization enforced and tested?
4. How does exclusive acceptance survive two simultaneous requests?
5. Why MongoDB, and when would PostgreSQL be better?
6. Why Mongoose plus Zod?
7. Why sessions instead of JWT/OAuth?
8. How do you prevent upload traversal/content spoofing/orphans?
9. Why cursor pagination and which fields form each cursor?
10. What do the performance numbers prove—and not prove?

Detailed model answers live in the phase learning notes under `docs/learning/` and the ADRs under `docs/adr/`.
