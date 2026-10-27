---
name: integrate-provider
description: Integrate a third-party service into the Flama API as a capability behind one interface, each vendor a provider, one ordered list, one fallback rule, so the next vendor is a class and a line. Use it whenever the user asks to integrate, connect, add or switch a third-party service, API, SaaS or vendor (SMS, payments, search, a calendar, an AI model, an email or storage vendor), to add another provider to something that already has one, to "make it easy to swap X later", or to call any outside API from apps/api, even if they never say "provider".
---

# Integrate a third-party service as providers

The shape, the fallback rule and the tests it owes are
`.agents/rules/provider-integrations.md`; the rate-limit half is
`.agents/rules/integrations.md`. This page is only the order of work. Read both
rules first. For a deployment-wide pluggable driver, `packages/backend/email`
and `packages/backend/storage` are the exemplars of the other shape
(`backend-packages.md`).

## 1. Decide the shape with the user

Ask, before any code:

1. **What is the capability**, as a verb the product needs ("send a text
   message")? The interface is named for it, never for a vendor.
2. **Which vendors now, and which next?** With exactly one and no plausible
   second, stop: a port and a gateway are the whole shape. With one vendor per
   deployment chosen by config, build a pluggable service instead
   (abstract class, implementations, factory in the module).
3. **Whose credential?** A tenant's own means providers.
4. **In what order are they tried, and why?** It is the module's list.
5. **Does a client show or hide something** on availability? Then it gets the
   status endpoint.

## 2. Write each vendor's budget before its gateway

In the gateway's doc comment (`integrations.md`): what it counts and against
what, the windows, how it says "stop", what one request costs. For an
undocumented vendor, say so, and map every unexpected answer to the module's
"provider unavailable" code.

## 3. Build it inside out

For a new capability: the shared ids and wire types, the module's error
catalog ("not configured", "provider unavailable", a `429`), the gateways, the
port and providers, the registry and the walk, the module's list, then the
slices (the command and, from step 1, the status query). Use `/scaffold-module`
for a new module and keep to its contract (`pnpm check:api-structure`,
`pnpm arch`). For one more provider on an existing capability, follow the
rule's "Adding a provider" and stop if it asks for more.

## 4. What a route owes

`@RequireScopes`, `@CheckPolicies` and the line in
`apps/api/src/__tests__/route-scopes.inventory.json`; Swagger decorators; each
new error code in its module's `domain/*.errors.ts` (and `apps/docs/docs/errors.md`
when the `docs` plugin is installed); config in `.env.example`;
`pnpm generate:api-client`.

## 5. Prove it

The tests the rule lists, then `pnpm ci:local`.

## What goes wrong when this is skipped

- The interface is named after the first vendor, so the second is a rename.
- The fallback is written at a call site, or one provider decides whether
  another runs.
- A rate limit falls through, spending a second vendor's budget.
- `availableFor` calls the vendor, so every status read costs a request.
- A client works out availability itself instead of asking the status.
