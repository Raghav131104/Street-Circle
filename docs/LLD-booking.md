# Request / Booking Low-Level Design

## Scope and terminology

A StreetCircle `request` is the booking workflow for one listing. The listing author is the owner; another active community member is the requester. IDs in request bodies never establish either identity: requester comes from the verified session and owner comes from the listing document.

## State machine

| Source | Target | Allowed actor | Listing transition |
| --- | --- | --- | --- |
| PENDING | ACCEPTED | owner | active -> reserved |
| PENDING | REJECTED | owner | unchanged |
| PENDING | CANCELLED | requester | unchanged |
| ACCEPTED | CANCELLED | requester or owner | reserved -> active |
| ACCEPTED | COMPLETED | requester or owner | reserved -> closed |
| PENDING | EXPIRED | local expiry worker only | unchanged |

Every other edge returns `409 REQUEST_TRANSITION_INVALID`. A user who is neither requester nor owner receives `403 REQUEST_FORBIDDEN`. The public transition schema does not expose `EXPIRED`; the local worker performs it with an atomic `PENDING` and `expiresAt <= now` predicate.

## Creation and idempotency

`POST /api/v1/requests` requires an `Idempotency-Key` header. A unique `(requesterId, idempotencyKey)` index makes a retry return the original request. Reusing a key for another payload returns `409 IDEMPOTENCY_KEY_REUSED`. A partial unique `(listingId, requesterId)` index prevents duplicate PENDING/ACCEPTED requests for the same pair while allowing a later request after rejection, cancellation, or expiry.

Transition operations also require an idempotency key stored on the bounded status-history entry. The update includes the expected source state. If two identical operations race, one update wins; the loser reloads, recognizes its operation key, and returns the same representation. If another operation won, the loser receives `409 REQUEST_STATE_CONFLICT`.

## Exclusive acceptance and transactions

A partial unique index on `listingId` where `status == ACCEPTED` is the final concurrency invariant: at most one accepted request can exist for a listing. Accept, accepted-cancel, and complete run the conditional request update and listing-status update in one MongoDB transaction. This prevents an accepted request with an active listing, or a completed request with a reserved listing.

Two different PENDING requests can be accepted simultaneously at the API edge. MongoDB permits exactly one partial-unique entry; the other transaction is translated to `409 REQUEST_SLOT_CONFLICT`. The Atlas verifier actually issues those two HTTP operations concurrently and checks one `200`, one `409`, one accepted document, and a reserved listing.

## Persistence shape

Requests reference listing, requester, and owner because each is independently queried and has a separate lifecycle. Status history is embedded because it shares the request lifecycle and the acyclic machine bounds it below the schema cap of 20. Explicit timestamps (`acceptedAt`, `completedAt`, `rejectedAt`, `cancelledAt`, `expiredAt`) support operational queries without scanning history.

Requester and owner dashboards use separate compound indexes on participant, status, creation time, and ID. Both APIs use creation-time/ID cursors and cap pages at 50. Request details are private to the two participants.

## Failure and consistency behavior

- Invalid edge: `409 REQUEST_TRANSITION_INVALID`.
- Stale concurrent edge: `409 REQUEST_STATE_CONFLICT`.
- Second accepted request: `409 REQUEST_SLOT_CONFLICT`.
- Duplicate active pair: `409 REQUEST_ALREADY_ACTIVE`.
- Replayed operation: `200` with `replayed: true` and no second history entry.
- Unrelated authenticated user: `403 REQUEST_FORBIDDEN`.
- Missing request: `404 REQUEST_NOT_FOUND`.

Atlas/network unavailability aborts the operation; no frontend-only state is treated as authoritative.
