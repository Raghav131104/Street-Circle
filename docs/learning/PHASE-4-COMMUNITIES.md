# Phase 4 Learning Note: Communities and Memberships

Community membership is a role-bearing relationship, not an array embedded in users or communities. A separate collection supports independent approval queries, avoids unbounded parent documents, and enforces one `(userId, communityId)` record with a unique compound index.

Community creation and owner-membership creation run in one MongoDB transaction. Without atomicity, a process failure between writes could create an ownerless community. Joining uses explicit `pending`, `active`, `rejected`, `blocked`, and `left` states. Rejected/left records may re-enter according to join policy; blocked records cannot interact.

Authorization policies are pure functions for owner/moderator/member behavior. Services load authoritative memberships and invoke these policies; controllers only translate HTTP. Owners and moderators review pending membership, only owners change roles, the owner role cannot be assigned/removed through the normal role endpoint, and an owner cannot leave without a future transfer/archive workflow.

Atomic conditional updates include the expected current state. If another request changes membership first, the loser receives stable `409 MEMBERSHIP_STATE_CONFLICT` instead of silently overwriting newer state.

Alternatives include embedding member IDs (simple but unbounded), one role column on users (cannot vary by community), or external policy engines (unnecessary at this size). The local limitation is transaction/network dependence on Atlas and no ownership-transfer workflow yet.

Likely interviewer questions:

1. Why is membership a separate collection?
2. Why use both role and status?
3. Which actions can moderators perform versus owners?
4. How does the conditional update prevent stale writes?
5. Why is community creation transactional?

Skeptical follow-ups:

1. What happens when the owner account is suspended?
2. How would you transfer ownership safely under concurrent requests?
