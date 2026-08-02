# StreetCircle Renovation Handoff

## 1. Implemented feature summary

StreetCircle is now a React/Express/Mongoose modular monolith with Atlas M0 development/test isolation, secure opaque server sessions, community/member/moderator/owner workflows, ownership-protected item/skill listings, browser/manual GeoJSON discovery, bounded cursor feeds, verified local images, a conflict-safe request state machine, persistent notifications, structured audit/log/metrics behavior, deterministic seed/backup/restore/explain/load scripts, and automated unit/integration/component/browser tests.

The Warehouse simulator separately gained explicit unreachable routes, BFS/A*/bounded-cache strategies, safe controller error behavior, pure metrics, 19 tests, robust CSV parsing, a deterministic benchmark, lazy Phaser/Recharts bundles, and a root verify command. No unjustified MERN backend was added.

## 2. Exact local setup

```powershell
git clone https://github.com/Raghav131104/Street-Circle.git
cd Street-Circle
npm.cmd ci
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
# Put least-privilege Atlas streetcircle_dev/streetcircle_test URIs in backend/.env
$env:NODE_OPTIONS="--tls-max-v1.2" # only if this network needs it
npm.cmd run db:ping
npm.cmd run seed
npm.cmd run dev
```

Full instructions, Atlas/IP guidance, backup/restore, and failure diagnosis are in `LOCAL-SETUP.md`.

## 3. Verification results

- Clean isolated `npm ci`: 398 packages installed from the valid root lockfile.
- StreetCircle lint/typecheck/build: passed; frontend 398.48 kB JS and 35.61 kB CSS before gzip.
- Backend Node tests: 51/51 passed.
- React/Vitest component tests: 11/11 passed.
- Offline HTTP integration: 4/4 passed.
- Five Atlas suites passed together: auth, communities, listings/media, requests/concurrency, notification persistence.
- Playwright Chromium MCT: 1/1 passed in 52.2 seconds, including clean marker-scoped teardown.
- StreetCircle npm audit: 0 vulnerabilities.
- Warehouse `npm run verify`: passed TypeScript, 19 tests, build, and route benchmark after its dependency fix; npm audit: 0 vulnerabilities.

The Codex environment grants external network and workspace writes to different Windows identities. Its final aggregate `npm run verify` passed lint, typecheck, all offline tests, and all five Atlas suites, then the network identity received `EPERM` while deleting `frontend/dist` owned by the workspace-write identity. Build and Playwright passed separately, so every constituent command is green. Run the aggregate once in normal PowerShell as the final machine-local release confirmation.

## 4. Architecture summary

The path is route -> security/validation middleware -> controller -> service/policy -> repository/Mongoose model -> Atlas. Controllers translate HTTP; services own authorization and invariants; repositories own persistence/atomicity; DTOs prevent internal-field leakage. Bounded child values are embedded and growing/shared entities are referenced. One deployable monolith preserves local simplicity and transaction boundaries.

## 5. Security improvements

- Removed localStorage/client-ID authority and every client-supplied ownership assumption.
- Bcrypt passwords, generic credential errors, dummy comparisons, normalized unique identities.
- 256-bit opaque HttpOnly cookie; only SHA-256 session hash stored; expiry/revocation/logout.
- Origin allow-list, CORS credentials policy, SameSite/production Secure cookies, Helmet, body/rate limits, Zod strict schemas.
- Central owner/moderator/member and participant authorization with negative tests.
- Magic-byte uploads, generated names, containment checks, bounded files/bytes, checksums, controlled reads, cleanup.
- Stable errors/request IDs, sensitive-log redaction, coordinate query stripping, audit records, loopback metrics.
- Both repositories currently report zero npm vulnerabilities.

## 6. Measured performance

On Node 24.14.1/Windows, i3-1215U, 7.73 GB RAM, Atlas M0, and 1,000 listings: nearby feed p95 204.15 ms at concurrency 10; login p95 1,040.87 ms at concurrency 2; listing creation p95 312.50 ms at concurrency 5; request creation p95 475.15 ms at concurrency 5; all four workloads had 0% errors. Login is deliberately bcrypt/CPU bound, so hashing was not weakened. See `PERFORMANCE.md` for p50/p99/throughput/resource values and limitations.

## 7. Known limitations

- Atlas M0 and current-IP allow-listing require internet/provider availability; the campus network intermittently blocks/TLS-resets port 27017.
- Local image disk is single-host state and is backed up separately from MongoDB.
- Rate limiting and metrics are process-local; no historical metrics/APM.
- Notification and audit side effects are not universally atomic with their initiating mutation.
- No password recovery, email verification, MFA, public deployment, managed secrets, formal abuse workflow, or complete reports UI.
- The performance sample is short/local/shared-process evidence, not a capacity/SLO claim.
- Phaser remains a 1.49 MB lazy minified chunk despite no longer blocking Warehouse initial JS.

## 8. Production evolution options

Define SLOs first. Then consider query/index/projection changes, an outbox worker for side-effect guarantees, object storage/CDN for multi-host media, distributed rate/session state only after multi-instance or latency evidence, managed secrets/central logs/metrics before public deployment, and a paid database tier only when M0 limits or availability targets are actually exceeded. Microservices/Kubernetes require independent team/deploy/scale boundaries; they are not default upgrades.

## 9. Interview questions and answer outlines

1. How did you eliminate IDOR? Identity comes from a verified session; services compare it to persisted ownership/membership and ignore client owner IDs.
2. How is the booking race prevented? Actor/state policy + expected-state transaction + partial unique accepted-listing index + idempotency keys; simultaneous Atlas test proves one winner/one 409.
3. Why MongoDB? Requested MERN, document lifecycles, native geo and required constraints; PostgreSQL/PostGIS is better if relational joins/reporting dominate.
4. Sessions versus JWT? Opaque sessions give immediate logout/revocation for one first-party SPA; trade-off is a DB lookup and Atlas availability.
5. Why Mongoose plus Zod? Mongoose shapes persistence; Zod validates untrusted runtime HTTP input before business logic.
6. Why cursor pagination? Bounded indexed keyset work and stability under inserts; trade-off is no direct page jump.
7. How are uploads secured? Limits, byte signatures, random keys, containment, checksums, non-executable controlled reads, and failure cleanup.
8. What do performance numbers prove? Only the stated local machine/dataset/concurrency; they identify bcrypt cost and show zero errors, not internet scale.
9. Why modular monolith? Multiple domains need boundaries but not distributed ownership/deployment; it keeps transactions and local operation simple.
10. Why no Warehouse MERN backend? Configure/simulate/export is already valuable; persistence becomes justified only for saved projects/datasets/comparative batches.

## 10. Honest proposed resume bullets

StreetCircle:

- Renovated a React/Express prototype into a JavaScript MERN modular monolith with MongoDB Atlas M0, Mongoose repositories, Zod runtime validation, secure server sessions, community RBAC, and database-backed geospatial listing discovery.
- Designed an idempotent request/booking state machine using conditional updates, MongoDB transactions, and a partial unique index; a concurrent Atlas integration test verifies one accepted request and one stable `409` conflict for an exclusive listing.
- Built validated local media storage, persistent in-app notifications, structured Pino/request-ID observability, backup/restore and load scripts; verified with 51 backend tests, 11 React tests, five live Atlas suites, and a Playwright MCT.
- Measured a 1,000-listing local/Atlas M0 workload with zero HTTP errors; recorded nearby-feed p95 204.15 ms and documented environment, tail latency, limitations, and migration triggers.

Warehouse simulator:

- Replaced unsafe blocked-cell route fallback with explicit unreachable results and a tested controller error state; implemented BFS, A*, and bounded cached-BFS strategies with equal-path correctness checks.
- Expanded the TypeScript/Vitest suite to 19 tests covering controller lifecycle/completion, multi-picker allocation, metrics, routing, deterministic demand, layout, and CSV edge cases; added a reproducible route benchmark and root verification command.
- Split Phaser and Recharts into lazy production chunks, reducing initial application JavaScript to 245.10 kB while documenting the remaining 1.49 MB Phaser chunk limitation.

Do not claim deployment, users, revenue, coverage percentage, production availability, or generalized scalability.

## 11. Remaining backlog

1. Run `npm run verify` from the user's normal PowerShell and save the exit result.
2. Add CI with an explicitly provisioned ephemeral/local MongoDB or protected Atlas test project.
3. Add password recovery/email verification only with a real provider/local-development workflow and abuse controls.
4. Complete reports/moderation product flow and retention policy.
5. Add transactional outbox/reconciliation only if notification/audit/media reliability targets require it.
6. Run longer, repeated, separate-process performance tests with 10k/100k data and regression thresholds.
7. Add production CSP/deployment/secrets/central telemetry only when public hosting is authorized.
8. Profile Warehouse frame/long-task behavior; move simulation to a Web Worker only if UI responsiveness measurements justify it.
