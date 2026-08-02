# Local Setup and Operations

## Prerequisites

- Git, Node.js 24+, and npm 11+.
- Existing free MongoDB Atlas M0 cluster and database user with `readWrite` only on `streetcircle_dev` and `streetcircle_test`.
- Current public IP added as `/32` in Atlas Network Access. Avoid `0.0.0.0/0`.
- Playwright Chromium for E2E (`npx playwright install chromium`).

## Install and configure

```powershell
git clone https://github.com/Raghav131104/Street-Circle.git
cd Street-Circle
npm.cmd ci
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

In `backend/.env`, replace both URI placeholders. The paths must end in `streetcircle_dev` and `streetcircle_test`. URL-encode reserved password characters. Do not paste credentials into source, screenshots, issues, or Git.

```env
MONGODB_URI=mongodb+srv://USER:ENCODED_PASSWORD@HOST/streetcircle_dev?retryWrites=true&w=majority
MONGODB_TEST_URI=mongodb+srv://USER:ENCODED_PASSWORD@HOST/streetcircle_test?retryWrites=true&w=majority
```

On the current campus network only, Node 24 sometimes needs a process-local TLS maximum. This keeps certificate verification enabled:

```powershell
$env:NODE_OPTIONS="--tls-max-v1.2"
```

Never set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Initialize and run

```powershell
npm.cmd run db:ping
npm.cmd run seed
npm.cmd run dev
```

Open Vite's printed URL. Demo accounts are `demo_owner` and `demo_member`; the deterministic seed prints their local-only password. Change/remove demo credentials before any public use.

## Quality gates

```powershell
npm.cmd run verify:offline
npm.cmd run test:integration:atlas
npm.cmd run test:e2e
npm.cmd run verify
```

`verify` is the release command. Test scripts assert `streetcircle_test` and perform marker-scoped cleanup. A TLS alert/timeout indicates the cluster/network/IP path; an assertion is an application failure and is never masked by the retry wrapper.

## Backup, restore, explain, and performance

```powershell
npm.cmd run db:backup
npm.cmd run db:explain
npm.cmd run test:load
```

Backups are under `project-data/backups` and include a manifest, canonical EJSON, counts, and SHA-256 checksums. They contain sensitive data and are gitignored. Restore replaces development collections, so it requires both an explicit directory and acknowledgement:

```powershell
$env:ALLOW_RESTORE="streetcircle_dev"
npm.cmd run db:restore -- "project-data/backups/2026-..."
Remove-Item Env:ALLOW_RESTORE
```

Test restore on disposable development data before relying on it. Local media bytes are separate from MongoDB backups; copy `project-data/uploads` independently for a complete recovery point.

## Common failures

- Atlas paused: press Resume and wait for healthy status.
- Authentication failed: verify the database username (not Atlas account email), password encoding, and database roles.
- `querySrv ETIMEOUT`, TLS alert 80, or port 27017 timeout: confirm current public IP, try a stable network/hotspot, and retain TLS verification.
- `EPERM` under `project-data`/`dist`: close processes using files and correct the directory permissions; do not run the application permanently as Administrator.
