# Persisted In-App Notifications

Notifications are MongoDB documents and remain available across server restarts. They are not derived from an open browser connection. Membership requests/decisions, request creation, request transitions, and system expiry create bounded notification messages without copying private request messages or precise locations.

`GET /api/v1/notifications` uses creation-time/ID cursor pagination with a maximum page of 50. `GET /unread-count`, `PATCH /:notificationId/read`, and `PATCH /read-all` always scope persistence queries to the authenticated user. A notification owned by another user is indistinguishable from a missing ID and returns `404`.

Action-specific deduplication keys are unique per user. Creation uses an upsert so retrying a command does not duplicate its notification. Socket.IO was intentionally not added: real-time delivery is optional, while MongoDB remains the durable recovery source. If added later, reconnecting clients must fetch the persisted cursor feed to recover missed events.

The Atlas verifier created notifications through membership and request HTTP workflows, denied a cross-user read action, restarted Express, recovered the same record using the existing server session, and verified unread, mark-one, mark-all, and status notification behavior.

Current limitation: domain update and notification insertion are not universally in one transaction/outbox. A database failure in the narrow gap can leave a successful action without its notification. If measured reliability requirements demand guaranteed delivery, use a transactional outbox in MongoDB plus a local worker; managed queues, email, SMS, and push remain alternatives only. Email/push introduce provider failures, consent, bounce/token lifecycle, retries, and cost.
