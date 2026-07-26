---
"@flama/api": patch
---

Harden the Stripe billing webhook and gateway error handling.

- **Out-of-order deliveries**: Stripe does not guarantee webhook ordering, so a
  late `subscription.updated` arriving after `subscription.deleted` could
  resurrect stale state. `SubscriptionEntity` now records the `created`
  timestamp of the last event it applied (`lastEventAt`) and discards anything
  older. Same-second events are still applied — Stripe's `created` has second
  resolution and re-applying identical data is idempotent.
- **Concurrent duplicate deliveries**: the check-then-insert in the webhook
  handler is not transactional, so two simultaneous deliveries could race
  between the lookup and the insert and surface an unmapped 500. A unique
  violation is now caught and reconciled against the row that won the race.
- **`sync()` returns whether it applied**, so the handler only persists (and
  only bumps `updatedAt`) when something actually changed.
- Gateway errors from Stripe are mapped to structured billing errors instead of
  leaking driver-level failures.

Adds an `AddSubscriptionLastEventAt` migration for the new column.
