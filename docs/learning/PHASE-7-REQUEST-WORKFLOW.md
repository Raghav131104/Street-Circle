# Phase 7 Learning Note: Conflict-Safe Request Workflow

A state machine defines legal lifecycle edges instead of allowing arbitrary status writes. Pure policy code decides the source/target/actor rule; the service derives identities and idempotency semantics; the repository performs conditional writes and cross-document transactions. This connects the HLD modular-monolith boundary to the LLD state table in `docs/LLD-booking.md`.

Expected-state predicates implement optimistic concurrency: an update succeeds only if the state has not changed since it was read. Idempotency keys distinguish a safe retry from a different competing command. A partial unique index on accepted listing IDs is the database-level invariant, so two Node processes cannot both accept different requesters. MongoDB transactions keep request and listing status synchronized.

Creation/list/get are O(1) index lookups or O(page size) bounded feeds. History is O(1) in practice because the acyclic transition graph is bounded and the schema caps it at 20. Transactions add database round trips and contention but protect a business invariant whose failure is more expensive than that latency.

Alternatives include a single conditional listing field containing accepted requester, compare-and-swap without a transaction, distributed locks, or a queue. A unique partial index plus transaction was chosen because MongoDB is already authoritative and the invariant is local to two documents. Redis locks or Kafka would add failure modes and are unjustified without measured contention or asynchronous throughput needs.

Security improves because requester/owner IDs are server-derived, private request reads require participation, and each action has explicit actor policy. Replays cannot duplicate accepted operations. The local limitation is Atlas transaction/network dependence and a polling expiry worker; production evolution might use a durable scheduled job system when expiry delay or worker coordination misses an explicit SLA.

Likely interviewer questions:

1. Why is a frontend-disabled Accept button insufficient concurrency protection?
2. How does the partial unique index stop two accepted users?
3. What is the difference between idempotency and optimistic concurrency?
4. Why update the listing in the same transaction?
5. Who may perform each transition and why?

Skeptical follow-ups:

1. What happens if two application instances run the expiry worker?
2. Could a transaction retry duplicate a status-history entry?

Discussion ladder: local state machine and Atlas transaction -> correct booking requirement -> polling delay and database dependency -> durable scheduler/queue/lock alternatives -> consistency and operational trade-offs -> migrate when expiry SLA, contention, or measured transaction latency requires it.
