# StreetCircle Renovation Baseline

Audit date: 2026-08-01
Repository commit: `7bb1f991fe89798baff19a90a7942c012eab9dfb` (`main`)
Remote: `https://github.com/Raghav131104/Street-Circle.git`

## Safety baseline

The renovation started from a dirty working tree. Twenty-five tracked files were modified (including nine tracked backend files deleted), and nine files were untracked. These changes predate the renovation and are treated as user-owned work. No reset, checkout, clean, or destructive Git command may be used.

The initial tracked-filename and content-pattern scans found no committed `.env`, private key, database URI, API key, or real credential. Placeholder password fields occur in documentation and `.env.example`, which is expected. This scan is evidence, not a guarantee that a credential cannot exist under an unrecognised format.

## Current implementation

- React 19, Vite, Axios, and Framer Motion in `frontend/`.
- Express 5 and `mysql2` in `backend/`.
- All backend routing, validation, business logic, persistence calls, errors, and server startup are in `backend/server.js`.
- API URLs are hardcoded to `http://localhost:5005/api`.
- The client stores a public user object in `localStorage`; the server has no authenticated session.
- Listing creation, personal-listing reads, and deletion trust client-supplied user identity. This is an IDOR/broken-access-control vulnerability.
- Listing discovery loads SQL rows and performs Haversine filtering in Node. It has no pagination and uses a fixed New York client coordinate.
- Images are Base64 values inside JSON/database records.

## Reproduced quality evidence

| Check | Baseline result |
| --- | --- |
| Frontend lint | Failed: 14 errors and 1 warning |
| Frontend build | Passed: JS 384.75 kB minified / 124.34 kB gzip |
| Backend lint/typecheck/test/build | No scripts exist |
| Automated StreetCircle tests | None |
| MongoDB Community Server | `mongod` not installed or not on `PATH` |
| Node/npm | Node 24.14.1; npm 11.11.0 (`npm.cmd` required by local PowerShell policy) |

The existing MySQL API cannot meet the target MERN acceptance criteria. MongoDB-backed integration and E2E checks will remain blocked until MongoDB Community Server is installed locally; pure unit, client, architecture, and build work can proceed independently.

## Warehouse simulator baseline

Repository: `C:\Users\91931\Desktop\warehouse pac man simulation\Phase3_Warehouse_Simulation`
Commit: `273f74597b80b1b41da7132cbc22df8018323824` (`main`)
Remote: `https://github.com/Raghav131104/Warehouse-pac-man-simulation.git`

- TypeScript typecheck passes.
- Six existing Vitest tests pass (five layout tests and one order-generator test).
- Production build reached bundling but failed while Vite cleared `dist/assets` with Windows `EPERM`; this is recorded as an environmental/file-lock baseline failure.
- `routePlanner.ts` falls back to a Manhattan path when BFS cannot route, including through blocked cells.
- Controller lifecycle, metrics, multi-picker allocation, and CSV edge cases lack tests.
- Phaser and Recharts are eagerly imported, contributing to the known large bundle.

## Requirements correction

Planning file `08-javascript-vs-typescript.md` recommends TypeScript, but the explicit renovation request requires React/Node/Express JavaScript and gradual migration. The explicit request takes precedence. StreetCircle will use strict modern JavaScript, focused JSDoc/shared contracts, Zod runtime validation, ESLint, and tests. The Warehouse simulator remains TypeScript.

## Ordered implementation

1. Quality baseline, workspace commands, app/server seams, validated configuration, errors, logging, health/readiness, and graceful shutdown.
2. MongoDB/Mongoose models, indexes, deterministic seed, isolated test database, backup/restore, and query-plan evidence.
3. MongoDB-backed cookie sessions, authentication, authorization policies, and negative security tests.
4. Communities and membership role workflows.
5. Ownership-protected listing CRUD, real GeoJSON discovery, filters, and cursor pagination.
6. Validated local media storage.
7. Conflict-safe request state machine and concurrency tests.
8. Durable in-app notifications.
9. Unit, integration, component, and Playwright critical-flow coverage.
10. Reproducible local load tests and measured optimization only.
11. Reliability, metrics, audit events, and sensitive-log verification.
12. Complete technical and interview documentation.
13. Warehouse correctness/tests/benchmark/bundle splitting, followed by an evidence-based MERN-extension decision.
