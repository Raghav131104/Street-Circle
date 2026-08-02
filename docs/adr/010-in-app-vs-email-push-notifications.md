# ADR 010: In-app versus Email/Push Notifications

## Context
Users need durable action updates without paid email/SMS/push services. Socket connections alone cannot recover missed events.

## Decision
Persist user-scoped notifications in MongoDB with deduplication, unread state, cursor feeds, and mark-one/all operations. Do not add Socket.IO until durable behavior is complete and a real-time need exists.

## Alternatives
Email, SMS, web/mobile push, Socket.IO-only events, no notifications.

## Why selected
It is free, restart-safe, testable, and uses the authenticated application as the delivery surface.

## Trade-offs
Users see updates only when opening the app. External channels improve reach but add consent, provider failures, token/bounce handling, retries, privacy, and cost.

## How verified
Atlas tests trigger notifications through membership/request actions, deny cross-user access, mark unread/read states, restart Express, and recover persisted records.

## Limitations
Initiating mutation and notification are not universally atomic; there is no real-time connected delivery.

## Migration trigger
Add a MongoDB outbox/worker when guaranteed delivery becomes an invariant; add email/push or Socket.IO only when measured engagement/timeliness requirements justify reliability and operational work.
