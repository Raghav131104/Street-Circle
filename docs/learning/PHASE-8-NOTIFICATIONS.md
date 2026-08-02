# Phase 8 Learning Note: Durable In-App Notifications

A notification feed is persisted application state, not a WebSocket message. Domain services create user-scoped documents; the notification service owns deduplication, unread state, DTOs, and cursor pagination; controllers expose only the authenticated user's records. This module consumes membership/request events while staying inside the modular monolith.

The user/read/time index serves unread counts and chronological feeds. A unique `(userId, deduplicationKey)` partial index makes repeated action hooks idempotent. Mark-one includes both notification ID and user ID in the database filter, preventing insecure direct-object access. List work is O(page size); unread count is an indexed count rather than an in-memory counter that could drift after restart.

Alternatives include Socket.IO, email, web push, SMS, polling a generic audit log, or a transactional outbox plus queue. MongoDB-backed in-app notifications were selected because they are free, durable, authorization-friendly, and recoverable. Socket.IO could reduce perceived latency but cannot replace persistence; email/push add provider and delivery lifecycle complexity.

Security improves through user-scoped queries and DTOs that avoid private messages and precise locations. Persistence adds storage/write amplification, while pagination keeps reads bounded. The key limitation is the absence of an outbox transaction covering every domain write and notification write.

Likely interviewer questions:

1. Why is Socket.IO not the notification source of truth?
2. How does notification deduplication work?
3. How do you prevent users from reading another user's notifications?
4. Why calculate unread count from MongoDB?
5. How does cursor recovery help after reconnect?

Skeptical follow-ups:

1. What happens if the domain transaction commits and notification insertion fails?
2. How would you deliver millions of emails without blocking API requests?

Discussion ladder: MongoDB notification feed -> durable local requirement -> no guaranteed outbox/realtime delivery -> transactional outbox, Socket.IO, email/push alternatives -> reliability/cost trade-offs -> migrate when measured missed-event rate, delivery latency, or channel requirements justify it.
