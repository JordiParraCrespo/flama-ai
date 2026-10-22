---
paths:
  - "apps/api/src/**/*"
  - "packages/shared/src/**/*"
---

# Third-party services are providers behind one interface

When the product needs something a third party does (send a message, read a
calendar, run a model), the product depends on **the capability**, never on a
vendor. The capability is one interface; each vendor that can do it is a
**provider** implementing it; the providers sit in **one ordered list** the
module builds. Adding a vendor is a class, its id and a place in the list.
Nothing else in the product changes. The `/integrate-provider` skill is the
order of work.

The starter ships no module of this shape yet: the first one sets the example,
so keep it to what is written here. This rule sits on top of two others and
replaces neither:

- `integrations.md`: every call to a system we do not run goes through one
  `UpstreamLimiter.exchange` (`@flama/backend-core`), with buckets for what the
  provider counts and a `429` code of its own. Each provider's gateway still
  owes all of that.
- `backend-packages.md`: a pluggable package (`email`, `storage`) picks **one**
  driver per deployment from config. Use that shape for plumbing the whole
  deployment shares. Use this one when the answer depends on the tenant (its
  own sign-in, its own key) or when more than one provider may be tried for one
  request. A single vendor, or a single deployment-wide driver, is not this
  shape: a port and its gateway are the whole of it until a second vendor is
  real.

## The shape

| Piece | Where |
| --- | --- |
| The capability's port: `id`, `availableFor(tenantId)`, `grantFor(tenantId, now)`, and the capability's own verb taking the grant | `<module>/application/<capability>-provider.port.ts` |
| One provider per vendor: reads its credential, calls its gateway, no HTTP | `<module>/application/<vendor>-<capability>.provider.ts` |
| One gateway per vendor, with its port: the HTTP, its own `UpstreamLimiter`, the vendor's answers mapped onto the module's error codes | `<module>/infrastructure/<vendor>-<capability>.gateway.ts` |
| The ordered list, which refuses two providers with one id, built with `useFactory` in the module | `<module>/application/<capability>-provider.registry.ts` |
| The walk: the one place that decides fallback | `<module>/application/<capability>.resolver.ts` |
| The provider ids, `as const`, which the DTOs and clients name | `packages/shared/src/schemas/<capability>.schema.ts` |
| Whether a tenant can: a query slice asking the registry | `GET /v1/<capability>/status` |

Dependencies follow `nestjs-di.md` and the layer rules in
`apps/api/ARCHITECTURE.md`: the port is a DI token, the registry is built in
the module's factory.

- **`availableFor` never spends the vendor's budget.** It is a row or a config
  read; a status read that calls the vendor turns a page view into a rate limit.
- **The grant is opaque outside its provider.** It carries whatever that
  provider needs.
- **The verb takes the grant, never a tenant id.** The credential is looked up
  once, in `grantFor`, where a failure counts as that provider failing.

## The fallback rule, written once

The walk tries the providers available for the tenant, in order:

1. The first one that answers is the answer, with its `id`, so the response and
   the logs say who answered.
2. **Anything but a rate limit falls through to the next provider**: the vendor
   refused, changed its answer, was unreachable, the grant failed, or asking
   whether it was available failed. So the walk asks each provider's
   `availableFor` in order, inside the same `try`, never all of them up front.
3. **A rate limit is answered at once** (the module's `429` code). It is the
   vendor saying "not now"; spending the next provider's budget hides it.
4. When every available provider failed, the **first** failure is the answer:
   it is the provider the tenant would have used.
5. When none is available, the module's "not configured" code.

No provider decides whether another runs, and no call site re-implements this.
A capability that needs another rule (fan out to every provider, pick by price)
writes it in its walk and says why in the doc comment.

## Credentials stay where they live

- A credential another module owns is read only through the port that module
  publishes for it (`*.di-tokens.ts`, `*.port.ts`), never through its
  repository or tables, and never copied. If that port has no cheap "is there
  one" for `availableFor`, add it to the port.
- A deployment-wide key is config (`<MODULE>_<VENDOR>_*` in the root
  `.env.example`), optional: its absence makes that provider unavailable, never
  a boot failure (`api-config.md`).
- A provider names itself to the vendor as this product. It never poses as
  another product's client or a browser to get past a vendor's gate.

## The status clients read

A client shows or hides the capability from `GET /v1/<capability>/status`
alone, never from its own list of providers. When the answer depends on a
tenant's credentials, every mutation that changes those credentials must
invalidate that query where it invalidates the credential list, or the screen
shows the answer from before a sign-in.

## Adding a provider to an existing capability

A gateway and its port, a provider class, its id in the shared list, and its
place in the module's list, where the order is a product decision the comment
explains. Config and an error row only if it needs them. If adding one means
editing the walk or a client, the shape did not hold: find out why.

## Tests the shape owes

- **The walk, over fake providers** typed by the port: first available wins,
  unavailable ones are never granted, a failure falls through (an `availableFor`
  that throws included), a rate limit does not, the first failure is the
  answer, none available is "not configured", two providers with one id are
  refused.
- **Each provider** over doubles of what it reads.
- **Each gateway** against a `fetch` double, as `integrations.md` lists.

## What this is not

- **Not a plugin system.** Providers are compiled in and listed in code; a
  tenant's choice is data (which credentials it has), never code loaded at run
  time.
- **Not a reason to hide the vendor.** The response names the provider that
  answered, so privacy statements stay true.
