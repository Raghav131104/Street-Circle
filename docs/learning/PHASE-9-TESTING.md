# Phase 9 Learning Note: Balanced Testing

## Definition and purpose

A balanced suite uses fast focused tests for business rules, database-backed integration tests for real persistence boundaries, component tests for user-visible states, and a small number of browser tests for critical workflows. It exists because no single test level gives both fast diagnosis and realistic confidence.

## StreetCircle flow

Policy and DTO tests isolate authorization and leakage rules. Service tests inject repositories to force races and error paths. Atlas tests exercise real unique, partial, TTL, and geospatial indexes in `streetcircle_test`. React Testing Library drives accessible labels and dialogs. Playwright drives the full React -> Express -> Mongoose -> Atlas path with two independent users.

This connects to the HLD modular boundaries and to the booking LLD state/actor matrix. Test data is referenced across independently growing collections and is removed by marker-scoped IDs. Security tests prove server-derived identity, private-record isolation, moderator boundaries, session revocation, signature validation, and conflict responses.

## Complexity and trade-offs

Unit tests are cheap and precise but cannot prove driver/index behavior. Atlas integration is realistic but slower and depends on the network. Browser tests find wiring and accessibility defects but are expensive and can be noisy, so one MCT flow covers the highest-value path. Parallel tests are avoided where the free Atlas tier and shared rate limits would distort results.

Local limitation -> the suite depends on an internet-accessible Atlas M0 cluster -> local MongoDB or ephemeral containers would remove that dependency -> those alternatives improve determinism but would no longer verify the user-selected managed topology -> add a containerized database when CI needs repeatable offline execution.

## Likely interviewer questions

1. Why not chase 100% coverage? Coverage does not prove invariant quality; critical authorization and state boundaries receive priority.
2. Why use both mocked services and Atlas? Mocks isolate rules; Atlas proves indexes, transactions, serialization, and driver behavior.
3. How are tests isolated? A dedicated database plus unique markers and ID-scoped cleanup; no database drop.
4. What makes the concurrency test meaningful? Two simultaneous accepts race against the same listing and the database constraint permits one winner.
5. Why only one E2E test? It covers the MCT; duplicating lower-level cases in a browser would increase cost and flakiness.

Skeptical follow-ups: Could retries hide defects? No, the wrapper retries only explicit network signatures and refuses assertion failures. Can marker cleanup delete real data? The script first asserts the test database name and selects its unique test prefix before deleting related IDs.
