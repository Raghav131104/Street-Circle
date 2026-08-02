# ADR 003: Cookie Sessions versus JWT/OAuth

Context: The prototype trusted a user object in localStorage and client-supplied IDs, enabling impersonation and IDOR.

Decision: Use an opaque secure cookie and MongoDB-backed server sessions. Store only a SHA-256 session-secret hash; derive identity on every request; revoke on logout.

Alternatives: Signed JWT access/refresh tokens, OAuth/OIDC, or localStorage tokens.

Why selected: One first-party local SPA needs simple revocation and has no third-party identity requirement. MongoDB is already durable source of truth. `HttpOnly` prevents direct JavaScript token theft.

Trade-offs: Each authenticated request reads session state; cookies require deliberate CSRF controls; Atlas availability affects authentication. JWT access tokens reduce lookup needs but complicate immediate revocation/rotation. OAuth reduces password ownership but introduces an external provider and redirect lifecycle.

How verified: Unit tests cover hashing, DTOs, normalization, generic errors, malformed/expired/revoked sessions, and cookie attributes. Atlas integration verifies the full lifecycle and rate limit.

Limitations: Single-region Atlas/network dependency, no password reset or email verification yet, and process-local limits. SameSite is defense-in-depth, not a complete XSS control.

Migration trigger: Consider Redis when measured session lookup throughput or multiple application instances require shared lower-latency state. Consider OAuth when external identity/SSO is a real product requirement. Consider JWT access tokens only when stateless verification benefits outweigh revocation complexity.
