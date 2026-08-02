# Phase 3 Learning Note: Authentication

Authentication establishes identity; authorization decides whether that identity may act on a resource. StreetCircle authenticates an opaque cookie against a hashed MongoDB session, then later services apply ownership/community-role policies. A browser-provided `userId` is data, never proof.

Internally, registration validates with Zod, normalizes identity, hashes the password with bcrypt, writes a user, creates 32 random bytes, stores their SHA-256 hash as a session, and sends the raw value only as an `HttpOnly` cookie. Authentication repeats the fast SHA-256 hash and queries an indexed session. Logout records revocation immediately; TTL deletion is cleanup, not correctness.

Security effects include eliminating localStorage identity impersonation, limiting token exposure to JavaScript, generic login failures, bounded brute-force attempts, origin validation, log redaction, and DTO filtering. SHA-256 is correct for high-entropy random session secrets; passwords require slow bcrypt because human passwords have low entropy.

Alternatives are JWT rotation, OAuth/OIDC, and Redis sessions. MongoDB sessions were selected for simple durable revocation in one process. The local limitation is a database read per authenticated request and external Atlas dependence. Migrate only after measured latency/throughput or multi-instance coordination requires shared faster state.

Likely interviewer questions:

1. Why hash a random session token but bcrypt a password?
2. Why is `HttpOnly` not complete XSS protection?
3. How do SameSite, Origin checks, and CORS differ?
4. Why check expiry if a TTL index exists?
5. How does logout revoke a session immediately?

Skeptical follow-ups:

1. Why accept a database lookup on every authenticated request?
2. What happens if an attacker steals the cookie before logout?
