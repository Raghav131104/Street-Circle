# Testing Strategy

StreetCircle uses a risk-based test pyramid. The suite emphasizes identity, authorization, state transitions, database constraints, upload boundaries, and critical user workflows instead of pursuing a cosmetic 100% coverage number.

## Commands

| Command | Scope |
| --- | --- |
| `npm test` | 51 backend unit/model/service tests and 11 React component tests |
| `npm run test:integration:offline` | 4 deterministic Express health/error/metrics tests without a database |
| `npm run test:integration:atlas` | Auth, communities, listings/media, requests/concurrency, and notification persistence against `streetcircle_test` |
| `npm run test:e2e` | One independent Playwright Chromium MCT workflow |
| `npm run verify:offline` | Lint, syntax checks, unit/component tests, offline integration, and build |
| `npm run verify` | Every mandatory check, including Atlas integration and Playwright |

The Atlas scripts assert that `MONGODB_TEST_URI` names `streetcircle_test`. Cleanup selects unique test markers and related IDs; it never drops a database and never depends on test execution order. The E2E test registers two users, creates and joins a community, approves membership, creates and discovers an image listing, proves unauthorized deletion returns `403`, completes a request/accept flow, reads notifications, and logs out.

## Evidence recorded on 2026-08-02

- Backend: 51/51 passed.
- React Testing Library/Vitest: 11/11 passed.
- Offline integration: 4/4 passed.
- Atlas: all five isolated suites passed in one group; network-only TLS failures were retried without retrying assertion failures.
- Playwright: 1/1 Chromium MCT passed in 54 seconds.
- Production build: passed; frontend output was 398.48 kB JavaScript and 35.61 kB CSS before gzip.

The managed Codex runner provides filesystem writes and external network access through different Windows identities, so its aggregate `npm run verify` cannot both write Vite output and reach Atlas in one process. Every constituent gate passed under the appropriate identity. A normal developer PowerShell has both permissions and remains the release source of truth for the aggregate command.

## What failures mean

Assertion, lint, build, and browser failures are release blockers. Atlas `querySrv ETIMEOUT`, TLS alert 80, or port 27017 timeouts on the current campus network are infrastructure failures; the bounded wrapper retries only those signatures and explicitly refuses retries when output contains `AssertionError` or `ERR_ASSERTION`. Certificate verification is never disabled.
