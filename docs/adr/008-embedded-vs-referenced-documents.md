# ADR 008: Embedded versus Referenced Documents

## Context
MongoDB supports both; careless embedding can create unbounded documents, while excessive referencing recreates joins and round trips.

## Decision
Embed only bounded values sharing a parent lifecycle: user profile, community rules, listing media metadata (max five), and request status history (max twenty). Reference growing/shared/independently queried users, sessions, memberships, listings, requests, notifications, reports, and audit events.

## Alternatives
Embed memberships/requests/notifications in parent documents; reference every subdocument.

## Why selected
The rule aligns lifecycle, query pattern, and bounded growth rather than applying one storage style universally.

## Trade-offs
References need extra queries/transactions; embedded data can be atomically read/updated but duplicates or enlarges parents.

## How verified
Schema validators cap arrays, index tests cover referenced queries, and live workflows prove joins-by-ID and transaction/conditional behavior.

## Limitations
Bound changes require schema evolution, and reports may need aggregation across collections.

## Migration trigger
Change a boundary when measured query frequency, document growth, atomicity, or duplication cost proves the current lifecycle assumption wrong; migrate data explicitly.
