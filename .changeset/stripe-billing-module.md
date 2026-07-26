---
"@flama/shared": minor
"@flama/api": minor
---

Add a Stripe billing module for subscriptions and revenue.

- **`@flama/shared`**: billing Zod schemas and types (`createCheckoutSchema`,
  `createPortalSchema`, subscription + revenue-metrics response schemas,
  `SubscriptionStatus`, `BillingInterval`), and a `Billing` known subject.
- **`apps/api`**: a new `billing` Domain-Driven Hexagon module with a
  `Subscription` and `BillingCustomer` aggregate, a Stripe `PaymentGatewayPort`
  - adapter, and endpoints:
  * `POST /v1/billing/checkout` — start a Stripe Checkout session
  * `POST /v1/billing/portal` — open the Stripe Customer Portal
  * `POST /v1/billing/webhook` — signature-verified subscription sync
  * `GET /v1/billing/subscription` — the caller's current subscription
  * `GET /v1/billing/subscriptions` — admin, paginated (RBAC `read Billing`)
  * `GET /v1/billing/metrics` — admin revenue metrics (MRR/ARR/churn)

  Subscription state is mirrored locally from webhooks; revenue metrics are
  computed from that table (no live Stripe reads). Adds the `subscription` and
  `billing_customer` tables via migration and enables Better Auth's raw-body
  parser so Stripe webhook signatures can be verified.
