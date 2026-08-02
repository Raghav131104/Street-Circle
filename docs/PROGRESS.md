# Renovation Progress

Status values: `not started`, `in progress`, `blocked`, `verified`.

| Phase | Scope | Status | Verification/evidence |
| --- | --- | --- | --- |
| 0 | Baseline audit and safe setup | verified | `docs/BASELINE-AUDIT.md`; existing lint/build/test commands recorded |
| 1 | Code-quality baseline | verified | `npm run verify` passed: lint, syntax checks, 5 backend tests, 3 integration checks, builds |
| 2 | MongoDB migration | verified | Atlas ping/seed/index sync passed; EJSON backup `2026-08-01T17-26-04-018Z`; feed IXSCAN examined 1 key/1 document and returned 1 |
| 3 | Authentication and authorization | verified | 18 backend tests; Atlas integration passed register/duplicate/me/malformed-cookie/logout-revocation/rate-limit after one bounded connection retry |
| 4 | Communities and memberships | verified | 5 policy tests plus Atlas create/owner/join/duplicate/forbidden/approve/role/leave/reject workflow; deprecation warnings removed |
| 5 | Listings and geospatial discovery | verified | 28 backend tests; root `verify`; Atlas auth/membership/identity/geo/cursor/ownership/update/delete workflow passed |
| 6 | Local media storage | verified | 33 tests and root `verify`; Atlas HTTP workflow proved ownership, signature rejection, safe read, and delete cleanup |
| 7 | Request/booking workflow | verified | 38 tests and root `verify`; Atlas simultaneous accept proved one 200/one 409, unique accepted slot, replay, privacy, reject/complete/cancel/expiry |
| 8 | Persisted notifications | verified | 44 tests and root `verify`; Atlas proved action hooks, cross-user denial, unread/read-all, and recovery after Express restart |
| 9 | Balanced test suite | verified | 51 backend, 11 React, 4 offline integration, 5 Atlas suites, production build, and 1 Playwright Chromium MCT passed (current cumulative counts) |
| 10 | Performance evidence | verified | 1,000-listing Atlas M0 run: four HTTP workloads, zero errors, p50/p95/p99/throughput/CPU/RSS/event-loop metrics, compound and geo index plans |
| 11 | Observability and reliability | verified | Pino/request IDs/redaction, loopback metrics, stable errors, health/readiness, database reporting, audit events, and tested graceful shutdown |
| 12 | Documentation and ADRs | verified | README, HLD, API, booking LLD, threat model, testing, performance, local setup, scalability, 11 ADRs, and phase learning notes |
| 13 | Warehouse simulator | verified | Explicit unreachable routes; BFS/A*/cache abstraction; 19 tests; controller/metrics/multi-picker/CSV coverage; benchmark; lazy Phaser/Recharts chunks; root verify passed |
| Final | Clean-clone acceptance and handoff | in progress | Handoff and evidence-based resume bullets complete; aggregate `verify` passed lint, typecheck, 51 backend tests, 11 React tests, 4 offline integration tests, and all five Atlas suites before the managed runner hit a Windows cross-identity `EPERM` deleting `frontend/dist`; build and Playwright passed separately |

## Current gate

Final acceptance awaits one normal-user PowerShell `npm.cmd run verify` confirmation. The Warehouse simulator remains browser-only because no meaningful persisted project/batch workflow currently justifies a MERN backend. StreetCircle's managed runner separates the Atlas-network identity from the workspace-write identity: the aggregate passed every check through all Atlas suites, then failed only when the network identity could not remove the other identity's `frontend/dist`. Every constituent gate has passed independently.
