# StreetCircle Architecture

StreetCircle is a MERN feature-based layered modular monolith, not the original MySQL demonstration.

```text
React SPA
  -> versioned JSON API + HttpOnly session cookie
Express route -> middleware -> controller -> service/policy -> repository/Mongoose model
  -> MongoDB Atlas M0
  -> local validated image storage
```

Authoritative identity comes only from a live server session. Community roles and listing/request ownership are enforced in services; database constraints protect uniqueness, idempotency, and exclusive acceptance under races. MongoDB performs nearby discovery using GeoJSON and a `2dsphere` index. Persisted notifications and audit events survive process restarts; local media bytes live outside MongoDB with checksum metadata.

The complete design, boundaries, limitations, and evolution path are in:

- [High-level design](docs/HLD.md)
- [Booking low-level design](docs/LLD-booking.md)
- [Database and indexes](docs/DATABASE.md)
- [API contract](docs/API.md)
- [Threat model](docs/THREAT-MODEL.md)
- [Architecture decisions](docs/adr/)

Prototype history is retained only in [the baseline audit](docs/BASELINE-AUDIT.md); it is not the current runtime architecture.
