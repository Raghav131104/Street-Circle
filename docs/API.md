# StreetCircle API v1

Base URL: `http://localhost:5005/api/v1`. JSON requests use `Content-Type: application/json`; browser calls include an allow-listed `Origin`. Protected endpoints use the `streetcircle_session` HttpOnly cookie. Request commands require `Idempotency-Key` where noted.

## Common response contracts

Success payloads wrap their resource (`{ "user": ... }`, `{ "listing": ... }`) or return a feed plus `nextCursor`. Errors are stable:

```json
{
  "error": {
    "code": "REQUEST_STATE_CONFLICT",
    "message": "Request state changed concurrently",
    "requestId": "1a2b..."
  }
}
```

Validation errors are `400`; unauthenticated `401`; unauthorized `403`; missing `404`; duplicate/state conflicts `409`; rate limiting `429`; dependency readiness `503`.

## Operations and authentication

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | No | Process liveness |
| GET | `/ready` | No | Database readiness |
| GET | `/metrics` | Loopback | HTTP/process/event-loop snapshot |
| POST | `/auth/register` | No | Username/email/password registration; returns session cookie |
| POST | `/auth/login` | No | Generic credential verification; returns session cookie |
| POST | `/auth/logout` | Yes | Revoke current server session and clear cookie |
| GET | `/auth/me` | Yes | Initialize client authentication from server truth |

Registration accepts username 3-40 (`A-Z`, `a-z`, digits, underscore), valid email up to 254, password 10-128, and optional display name. Login accepts username or email as `identifier`. Auth endpoints have a stricter 10-per-15-minute process-local limiter.

## Communities and memberships

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/communities` | No | Up to 50 public active communities |
| POST | `/communities` | Yes | Create community and atomic owner membership |
| GET | `/communities/mine` | Yes | Current active/pending memberships |
| GET | `/communities/:communityId` | No | Community detail |
| GET | `/communities/:communityId/memberships` | Moderator | Bounded status review queue |
| POST | `/communities/:communityId/memberships` | Yes | Join/request membership |
| PATCH | `/communities/:communityId/memberships/:membershipId` | Policy | `approve`, `reject`, `change_role`, or `block` |
| DELETE | `/communities/:communityId/memberships/me` | Member | Leave; owner is protected |

Community coordinates are longitude/latitude numbers, coverage is 100-50,000 meters, rules are capped at 20, and visibility/join policy are explicit enums.

## Listings and media

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/listings` | No | Filtered/cursor feed; optional nearby search |
| POST | `/listings` | Active member | Create item/skill with server-derived author |
| GET | `/listings/:listingId` | No | Active/reserved/closed detail |
| PATCH | `/listings/:listingId` | Author/moderator | Validated update/status change |
| DELETE | `/listings/:listingId` | Author/moderator | Soft remove plus media cleanup |
| POST | `/listings/:listingId/media` | Author/moderator | Multipart `files`, max 5, 5 MiB each |
| DELETE | `/listings/:listingId/media/:mediaId` | Author/moderator | Remove metadata and local file |
| GET | `/media/:key` | No | Controlled verified image read |

Listing filters: longitude+latitude together, radius 100-50,000 meters, community, item/skill type, category, status, search, opaque cursor, and limit 1-50. Coordinates use GeoJSON `[longitude, latitude]`. Supported media bytes are JPEG, PNG, and WebP; claimed names/MIME types are not trusted.

## Requests/bookings

| Method | Path | Auth | Idempotency | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/requests` | Yes | No | Requester/owner cursor feed |
| POST | `/requests` | Active member | Required | Create pending request |
| GET | `/requests/:requestId` | Participant | No | Private detail/history |
| PATCH | `/requests/:requestId/status` | Actor policy | Required | Transition state |

States: `PENDING -> ACCEPTED -> COMPLETED`; `PENDING -> REJECTED`; `PENDING|ACCEPTED -> CANCELLED`; system `PENDING -> EXPIRED`. Invalid/stale/slot conflicts return stable `409` codes. A successful replay returns `200` and `replayed: true`; first creation returns `201`.

## Notifications

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/notifications?limit=20&cursor=...` | Yes | Durable user-scoped feed |
| GET | `/notifications/unread-count` | Yes | Current unread count |
| PATCH | `/notifications/read-all` | Yes | Idempotently mark all read |
| PATCH | `/notifications/:notificationId/read` | Yes | Mark own notification; foreign IDs look missing |
