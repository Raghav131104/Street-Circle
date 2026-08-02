# StreetCircle High-Level Design

## Scope and product stage

The original prototype was a React/Express/MySQL demonstration with client-trusted identity, fixed location, unbounded reads, and Base64 images. The implemented MCT is a MERN feature-based modular monolith: one React SPA, one Express process, one MongoDB Atlas M0 cluster with isolated development/test databases, and local filesystem media. MVP means the smallest secure valuable neighbor workflow; MMP is a future marketability concept. MVC is a code pattern, not a release stage. MMVC is not used.

## Context and containers

```text
Browser
  | HTTPS/JSON + HttpOnly opaque session cookie
  v
React SPA
  | /api/v1
  v
Express modular monolith
  |-- auth/users
  |-- communities/memberships
  |-- listings/local media
  |-- requests/booking state machine
  |-- notifications/moderation/audit
  |-- shared validation/errors/logging/metrics
  |
  +--> MongoDB Atlas M0: streetcircle_dev or streetcircle_test
  +--> project-data/uploads: verified image bytes
```

Atlas M0 was explicitly selected by the user. It is free but requires internet, an account, current-IP allow-listing, and provider availability; it is not described as a purely offline dependency.

## Request path and responsibilities

`route -> cross-cutting middleware -> controller -> service/policy -> repository/Mongoose model -> MongoDB`

- Routes define URLs, verbs, authentication requirements, uploads, and Zod schemas.
- Middleware owns CORS/origin checks, Helmet, rate limiting, JSON limits, request IDs, session attachment, metrics, and error translation.
- Controllers translate validated HTTP data into primitive service arguments and responses.
- Services enforce membership, ownership, role, idempotency, state-machine, and notification rules without importing Express request/response objects.
- Repositories/models own queries, conditional updates, transactions, indexes, and persistence.
- DTOs expose public fields and never return password hashes, normalized identity fields, session hashes, or raw Mongoose internals.

Feature modules may call another module's service for a real use case (for example membership actions create notifications). They do not bypass policies by importing controllers. Shared infrastructure contains only genuinely cross-cutting code.

## Core data decisions

Users, sessions, communities, memberships, listings, requests, notifications, reports, and audit events are referenced collections because their lifecycles or queries differ. Bounded profile/rules/media metadata/status history are embedded because they share the parent lifecycle. Memberships, requests, notifications, files, and audit histories are never unbounded arrays.

Identity uniqueness, one user/community membership, request idempotency, and one accepted request per exclusive listing are database constraints. GeoJSON stores `[longitude, latitude]`; `$geoNear` uses a `2dsphere` index. Feeds are capped at 50 and use stable cursors rather than growing offsets.

## Security boundaries

The server derives identity from a verified, non-expired, non-revoked session. Client `userId`, `authorId`, ownership, and roles are never authoritative. Passwords use bcrypt; opaque cookie secrets are 256-bit random values and only SHA-256 hashes are stored. Unsafe cookie-authenticated requests require an allow-listed Origin. Helmet, bounded JSON/uploads, rate limits, magic-byte media validation, safe filenames, and role/ownership policies provide defense in depth.

## Reliability and operations

Liveness does not touch MongoDB; readiness does. Pino logs contain a request ID and strip location query strings. Loopback metrics expose low-cardinality HTTP/process/event-loop aggregates. Sensitive actions create audit events. Shutdown stops the expiry worker, drains HTTP, closes MongoDB, and has a 10-second fail-safe.

Backups are checksum-protected canonical EJSON under gitignored project data; restore requires an explicit `streetcircle_dev` acknowledgement. The request expiry worker uses the database as durable truth. Persisted notifications survive restarts; Socket.IO, Redis, queues, email, SMS, and push are not implemented.

## Verified quality and performance

The suite covers unit/policy/model rules, React states, offline HTTP contracts, five live Atlas workflows, and one Playwright MCT. The measured 1,000-listing run recorded zero HTTP errors; detailed scope and percentiles are in `PERFORMANCE.md`. This is local evidence, not a generalized scalability claim.

## Known limitations

Atlas/network availability affects development and sessions. Local disk media prevents safe multi-host scaling. Rate limits and metrics are process-local. Notification/audit side effects are not universally transactional with the initiating mutation. There is no email verification, password recovery, message/chat system, production deployment, or paid infrastructure claim.
