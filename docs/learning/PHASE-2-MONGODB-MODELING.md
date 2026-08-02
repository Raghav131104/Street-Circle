# Phase 2 Learning Note: MongoDB Modeling

MongoDB stores BSON documents in collections. Mongoose adds schemas, casting, validation, middleware, and model APIs; MongoDB—not Mongoose—is still responsible for atomic writes and unique-index enforcement. External HTTP input will be validated with Zod because Mongoose is a persistence boundary, not the public API contract.

StreetCircle embeds bounded values with the same lifecycle (profile, rules, up to five media metadata records, up to twenty request-history entries) and references growing/independently queried entities (memberships, requests, notifications, reports, audit events). This avoids unbounded arrays, oversized documents, and hot-parent contention.

GeoJSON points store `[longitude, latitude]`. The `2dsphere` index lets MongoDB narrow spatial candidates rather than loading every listing and calculating Haversine distance in Node. A database query is still bounded by radius and page size in Phase 5.

Unique indexes are concurrency controls, not just performance features: normalized identities, one membership pair, idempotency keys, and one partial accepted request per listing remain correct when two requests race. Services must translate duplicate-key errors to stable `409` responses.

Complexity: an unindexed equality scan is O(n) documents; a selective B-tree lookup is approximately O(log n + k), with `k` matches. Indexes consume O(n) space and add index maintenance to writes. Geospatial complexity depends on distribution and query region, so `explain()` evidence is required.

Alternatives include the native driver (less abstraction/control overhead), SQL (stronger relational constraints and joins), and embedding more data (fewer reads but worse growth/contention). Mongoose was chosen for schema clarity and portfolio explainability; repository wrappers will only be added around meaningful query responsibilities.

Likely interviewer questions:

1. When do you embed versus reference?
2. Why is longitude first in GeoJSON?
3. Does `unique: true` validate uniqueness in application memory?
4. What does a compound-index prefix mean?
5. Why use a partial unique index for accepted requests?

Skeptical follow-ups:

1. Why migrate from relational storage when booking constraints are relationally natural?
2. How do you prove the proposed index improves the actual query rather than merely adding write cost?
