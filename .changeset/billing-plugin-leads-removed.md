---
"@flama/api": major
"@flama/shared": major
"@flama/api-client": major
"@flama/translations": minor
"@flama/web": patch
---

Stripe billing leaves the starter for the `billing` plugin, and the `leads`
example is removed.

- `@flama/api` no longer ships `BillingModule`, its migrations, the `stripe`
  config or the `stripe` dependency, and no longer ships `LeadsModule`.
  `pnpm plugin:add billing` puts billing back, then
  `pnpm generate:api-client`.
- `@flama/shared` drops the `billing` and `leads` scope resources and
  permission groups, the `stripe_billing` capability, the `Billing` subject,
  the `/billing/subscriptions` endpoint policy and the billing and lead schemas.
- `@flama/api-client` drops the billing and leads endpoints and models. Its
  legacy models now take `Scope`, `ScopeResource` and `ClientCapabilities` from
  `@flama/shared` instead of spelling them out. `openapi-ts` reads
  `apps/api/openapi.json` from the right path again, so `src/generated` is
  regenerated.
- `@flama/translations` drops the `BILLING_*` and `LEAD_*` error copy; the
  plugin carries the billing copy.
- `@flama/web`'s permission picker gives a resource without an icon of its own
  a generic key icon, so a plugin's scope group renders without an edit here.
