# StreetCircle

StreetCircle is a neighborhood sharing platform that helps people organize trusted local communities and exchange useful items and skills. Users can create public communities, request or approve membership, discover nearby listings with browser or manually entered location and 2 km, 5 km, or 10 km radius filters, upload validated listing images, and manage availability requests through a conflict-safe booking workflow. Persisted in-app notifications keep membership and request activity visible after restarts. The current release does not claim general member chat or event management; an optional message belongs only to a listing request.

The project is an interview-ready renovation of a React/Express/MySQL prototype into a tested MERN modular monolith. Its MCT adds secure sessions, role-based community authorization, ownership-protected geospatial listings, local media, durable notifications, measured local performance, structured observability, and tested graceful shutdown. See [docs/PROGRESS.md](docs/PROGRESS.md).

## Implemented today

- React and JavaScript client with browser geolocation and manual fallback
- Express feature modules with route/middleware/controller/service/repository boundaries
- MongoDB Atlas M0 and Mongoose, isolated development/test databases, deterministic seed, EJSON backup/restore
- Hashed server sessions in HttpOnly cookies, bcrypt passwords, Zod validation, CORS allow-list, Helmet, rate limiting
- Community creation and membership approval/rejection/role/leave policies
- Item/skill listing CRUD with server-derived identity and author/moderator authorization
- GeoJSON `Point`, `2dsphere` radius queries, filters, bounded cursor pagination
- Local multipart images with byte-signature validation, safe random keys, checksums, controlled reads, and cleanup
- Request/booking state machine with actor policies, idempotent commands, MongoDB transactions, and one accepted user per listing
- Persisted in-app notifications with deduplication, unread/read-all state, cursor pagination, and restart recovery
- Pino logs, request IDs, stable errors, health/readiness, graceful shutdown
- Loopback process/HTTP metrics and structured audit events for sensitive actions

No paid tier is required. Atlas M0 is the user-selected free managed database dependency, so the application currently needs internet connectivity and an Atlas account.

## Local setup

Prerequisites: Node.js 24+, npm 11+, an active Atlas M0 cluster, a least-privilege database user, and your current public `/32` address in the Atlas IP access list.

```powershell
git clone https://github.com/Raghav131104/Street-Circle.git
cd Street-Circle
npm.cmd ci
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Set `MONGODB_URI` and `MONGODB_TEST_URI` in `backend/.env`. Keep that file private. Session secrets are generated randomly per login and only their hashes are stored. Then:

```powershell
npm.cmd run db:ping
npm.cmd run seed
npm.cmd run dev
```

The frontend uses the URL printed by Vite; the API defaults to `http://localhost:5005/api/v1`. On the current Windows/network environment, Node 24 occasionally needs this temporary process setting for Atlas TLS negotiation:

```powershell
$env:NODE_OPTIONS="--tls-max-v1.2"
```

Do not disable certificate verification.

## Verification and operations

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:integration
npm.cmd run build
npm.cmd run verify
npm.cmd run test:auth:atlas
npm.cmd run test:communities:atlas
npm.cmd run test:listings:atlas
npm.cmd run test:requests:atlas
npm.cmd run test:notifications:atlas
npm.cmd run test:e2e
npm.cmd run test:load
npm.cmd run db:backup
npm.cmd run db:explain
```

The root lockfile is committed for reproducible workspace installation. Atlas-backed commands require the current public IP in the Atlas access list and may need bounded retries on an unstable campus network; application assertion failures are never retried.

## Architecture

```text
React client
    -> JSON API + HttpOnly session cookie
Express route -> middleware -> controller -> service/policy -> repository/model
    -> MongoDB Atlas M0
```

Business services do not depend on Express request/response objects. DTOs exclude password hashes, normalized identity fields, session hashes, and internal Mongoose data.

## Product terminology

- Prototype: the original demonstration.
- MVP: the smallest secure valuable workflow.
- MCT: this project's minimum complete and testable release target.
- MMP: a future marketable-product discussion concept.
- MVC: an architectural pattern, not a product stage.
- Modular monolith: the selected system structure.

Detailed decisions and current evidence are under `docs/`. Resume bullets will be proposed only after their corresponding functionality and verification exist.

Start with [local setup](docs/LOCAL-SETUP.md), [high-level design](docs/HLD.md), [API](docs/API.md), [threat model](docs/THREAT-MODEL.md), [testing](docs/TESTING.md), [performance](docs/PERFORMANCE.md), and [scalability](docs/SCALABILITY.md).
