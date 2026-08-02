# Authentication and Authorization

StreetCircle uses server-side sessions. Registration/login returns an opaque 256-bit random secret in an `HttpOnly`, `SameSite=Lax`, API-path-scoped cookie. MongoDB stores only SHA-256 of that secret with user ID, expiry, revocation, and limited creation metadata. Every protected request hashes the cookie, finds a live non-revoked session, loads an active user, and derives `req.auth`; client-supplied user IDs are never authoritative.

Development cookies omit `Secure` because localhost uses HTTP. Production mode adds `Secure` and requires HTTPS. Unsafe requests carrying the session cookie must have an allow-listed browser `Origin`; JSON content type, CORS allow-list, and SameSite cookies provide additional CSRF resistance. XSS remains important because an attacker can cause actions from an infected page even though `HttpOnly` prevents reading the cookie.

Passwords use bcrypt with configurable cost 12. Login returns the same `401 INVALID_CREDENTIALS` for missing users and wrong passwords and performs a dummy bcrypt comparison for missing identities to reduce timing/account-enumeration differences. Auth endpoints have a stricter process-local rate limit. This limit resets on process restart and is not shared across instances.

Logout atomically sets `revokedAt`; `/auth/me` rejects the old cookie afterward. A TTL index eventually deletes expired sessions, but queries always check expiry directly because TTL cleanup is asynchronous. DTO mapping excludes password hashes, normalized identities, and session data.

Verified Atlas test flow: register, duplicate conflict, cookie attributes, authenticated `me`, malformed cookie rejection, logout/revocation, and rate limiting. Test records are uniquely tagged in `streetcircle_test` and removed afterward.
