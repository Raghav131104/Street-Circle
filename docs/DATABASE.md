# MongoDB Data Model and Indexes

## Implemented database

StreetCircle uses the existing MongoDB Atlas M0 free cluster selected by the user after local Community Server installation failed. Application data is isolated in `streetcircle_dev`; automated tests use `streetcircle_test`. The pre-existing `streetcircle` database is not read, modified, migrated, or deleted.

This is a requirements correction: Atlas M0 is now an implemented free managed dependency, not merely an interview alternative. Paid Atlas tiers remain unimplemented. M0 reduces local installation work but requires internet access, an IP access list, and an external account; a local Community Server avoids those dependencies.

## Collections and ownership

| Collection | Responsibility | Growth decision |
| --- | --- | --- |
| users | Identity/profile and optional bounded home point | Profile embedded because it is bounded and shares lifecycle |
| sessions | Hashed session secrets, revocation and expiry | Referenced because sessions expire independently and can grow |
| communities | Rules, visibility, owner and bounded coverage | Rules embedded and bounded |
| memberships | User/community role and status | Referenced; membership arrays are unbounded |
| listings | Community listing, location and bounded media metadata | Up to five metadata records embedded; file bytes remain outside MongoDB |
| requests | Booking state, idempotency and bounded status history | Separate workflow entity; history capped at 20 |
| notifications | Durable per-user notification feed | Separate for cursor pagination and unread queries |
| reports | Moderation workflow | Separate independently queried queue |
| auditevents | Append-only sensitive-action evidence | Separate unbounded history |

Password hashes and session secrets are excluded from normal Mongoose selection. Identity fields have display and normalized forms; services must normalize before writes and database uniqueness is authoritative under races.

## Query-driven indexes

- `users.usernameNormalized` and `users.emailNormalized`: unique account lookup/creation.
- `sessions.expiresAt`: TTL cleanup; `(userId, revokedAt, expiresAt)` supports session lifecycle queries.
- `communities.slug`: unique route lookup; `center: 2dsphere` supports nearby discovery.
- `(memberships.userId, communityId)`: unique invariant; community/status/role serves approval queues.
- `listings.location: 2dsphere`: database geospatial search.
- `(listings.authorId, createdAt, _id)`: owner dashboard and stable cursor.
- `(listings.communityId, status, category, createdAt, _id)`: filtered community feed.
- requester/owner request indexes support both dashboards.
- unique `(requesterId, idempotencyKey)` protects retries.
- partial unique `listingId` when `ACCEPTED` protects exclusive acceptance under concurrency.
- `(notifications.userId, readAt, createdAt, _id)` supports unread/list pagination.

Indexes reduce examined documents but add memory/storage and write amplification. On 2026-08-02, the seeded community feed used `ix_listings_community_feed` through `IXSCAN` (1 key/1 document examined, 1 returned). The nearby query used `GEO_NEAR_2DSPHERE`/`IXSCAN` on `geo_listings_location` (13 keys/2 documents examined, 1 returned). This proves index selection for deterministic queries; the tiny explain dataset does not prove performance at scale.

## Operational commands

```powershell
npm.cmd run db:ping
npm.cmd run seed
npm.cmd run db:backup
$env:ALLOW_RESTORE='streetcircle_dev'
npm.cmd run db:restore -- project-data/backups/<timestamp>
npm.cmd run db:explain
```

Restore is deliberately guarded and only accepts a `streetcircle_dev` manifest. Backups use canonical EJSON to preserve BSON types and SHA-256 checksums to detect corruption. Backup files are gitignored. Atlas M0 has operational limits and is not evidence of high availability or production scale. Initial connection attempts failed transiently before bounded retries succeeded, demonstrating the external network dependency.
