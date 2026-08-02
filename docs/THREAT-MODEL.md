# Threat Model

## Assets, actors, and trust boundaries

Assets include password hashes, session capability secrets, identity/role state, private request details, precise location, uploaded bytes, moderation actions, and database backups. Actors are anonymous visitors, members, moderators, owners, a malicious authenticated user, and a compromised browser. Boundaries are browser-to-Express, Express-to-Atlas, Express-to-local disk, and operator-to-environment/backup scripts.

## Main threats and controls

| Threat | Example | Implemented controls | Residual risk |
| --- | --- | --- | --- |
| Spoofing | Client sends another `userId` | Opaque HttpOnly cookie; hashed server session; identity derived on every request | Stolen browser session can act until expiry/logout |
| Tampering | Accept two requests concurrently | Actor/state policy, expected-state update, transaction, partial unique accepted-slot index, idempotency keys | Atlas outage aborts work; multi-document alternatives require care |
| Repudiation | Moderator denies blocking member | Request IDs, Pino JSON logs, structured audit events | Local audit write is best-effort, not compliance-grade |
| Information disclosure | IDOR reads private request/notification | Participant/user-scoped queries, DTO mapping, generic login errors, log redaction | Public listings deliberately expose listing location |
| Denial of service | Huge JSON/upload/brute force | 256 KiB JSON, max 5 x 5 MiB media, global/auth rate limits, bounded pages/radius, timeouts | Process-local limiter resets/repeats across instances; memory-buffered uploads consume RAM |
| Elevation of privilege | Member performs moderation/delete | Central membership/ownership policies; owner protection; negative tests | Application bugs remain possible; review new endpoints against policy matrix |
| Injection | NoSQL/operator or path injection | Zod strict schemas, typed repository construction, generated file keys, path containment checks | Regex search can still cost CPU within bounded input |
| Malicious upload | Renamed script or traversal path | Byte signatures, fixed image allow-list, random keys, create-only writes, controlled media route | Not a malware scanner or full image decoder |

## CSRF and XSS

Cookies are `HttpOnly`, `SameSite=Lax`, API-path scoped, and `Secure` in production. Unsafe methods require an allow-listed `Origin`; CORS credentials are limited and JSON/multipart flows avoid simple cross-site form assumptions. This is defense in depth, not permission to introduce state-changing GET endpoints. XSS cannot read an HttpOnly cookie but can cause requests from the legitimate page, so React escaping, no unsafe HTML rendering, Helmet, dependency review, and CSP evolution remain important.

## Secrets and privacy

`.env`, uploads, backups, and test artifacts are gitignored. Database roles are limited to read/write on development/test databases and Atlas access uses a current `/32` instead of `0.0.0.0/0`. Passwords, cookies, authorization headers, hashes, session secrets, request message contents, and query-string coordinates must not enter logs. Backups contain application data and need filesystem access control and deletion/retention policy.

## Abuse and unavailable controls

There is no email verification, password reset, account recovery, MFA, CAPTCHA, malware scanning, automated moderation, formal retention, or production secret manager. Reports have a model but no complete product UI/workflow. Before public deployment, add abuse reporting/triage, stronger distributed rate limiting based on measured abuse, CSP verification, dependency/secret scanning in CI, backup restore drills, and session/device management.

## Review triggers

Repeat threat modeling when adding chat/private messages, external identity, public deployment, multiple API instances, object storage, payment, precise home location, or third-party webhooks. Those changes introduce new trust boundaries and cannot inherit this assessment automatically.
