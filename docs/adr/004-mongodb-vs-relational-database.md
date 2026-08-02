# ADR 004: MongoDB versus MySQL/PostgreSQL

## Context
StreetCircle needs MERN alignment, GeoJSON discovery, evolving listing/community shapes, sessions, notifications, and an explicit booking invariant. The prototype used MySQL; PostgreSQL/PostGIS was a viable relational option.

## Decision
Use MongoDB for the renovated application, with referenced collections, bounded embedded values, explicit indexes, conditional updates, and transactions where multi-document consistency is required.

## Alternatives
MySQL; PostgreSQL with PostGIS; polyglot persistence.

## Why selected
It satisfies the requested MERN stack, offers native `2dsphere` queries, and maps bounded document state naturally while still supporting unique constraints and transactions.

## Trade-offs
Relationships and cross-collection integrity live partly in services; document flexibility can become schema drift without Mongoose/Zod. PostgreSQL provides stronger relational constraints and sophisticated joins; PostGIS is excellent for geo workloads.

## How verified
Live Atlas tests prove unique identities/memberships, geospatial lookup, transaction-backed acceptance, partial unique slot enforcement, cursor feeds, and persistence across restart.

## Limitations
The chosen database is not evidence MongoDB is universally better. Reports and analytics across relationships may be more awkward.

## Migration trigger
Reconsider PostgreSQL when measured workflows become join/transaction/reporting dominant, relational constraints materially reduce defects, and migration cost is justified by explicit requirements.
