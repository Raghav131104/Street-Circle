# ADR 011: Cursor versus Offset Pagination

## Context
Listings, requests, and notifications grow and change while users paginate. Unlimited reads and large offsets waste work and can duplicate/skip records under concurrent inserts.

## Decision
Use opaque stable cursors with deterministic tie-breakers and page limits up to 50. Time feeds use `(createdAt, _id)`; nearby feeds use `(distanceMeters, _id)`.

## Alternatives
Offset/limit pages; unbounded reads; keyset cursors exposing raw fields.

## Why selected
Cursor/keyset pagination follows indexed sort order, bounds work, and remains stable as earlier records are inserted.

## Trade-offs
Clients cannot jump directly to page N, total counts require separate work, and cursor schemas must be versioned/validated.

## How verified
Unit tests cover cursor round trips/malformed values and next-cursor generation; live Atlas listing tests prove bounded geo/feed pagination.

## Limitations
Nearby distances can change when coordinates change, and cursors are not permanent bookmarks.

## Migration trigger
Use offset only for small, stable administrative datasets requiring direct page jumps; adopt search-engine tokens when a measured full-text/search product outgrows MongoDB query semantics.
