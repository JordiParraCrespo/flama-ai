---
"@flama/shared": minor
"@flama/api": minor
"@flama/api-client": minor
"@flama/frontend-core": minor
"@flama/frontend-web": minor
"@flama/frontend-mobile": minor
"@flama/translations": minor
"@flama/web": minor
"@flama/mobile": minor
---

Add server-evaluated feature flags, wired into the API, web and mobile.

Flags are declared in code, targeted in the database, evaluated on the server
and read on every client from one endpoint — the shape Stripe and Revolut
describe for their own.

- **`@flama/shared`** gains `feature-flags/`: the `FEATURE_FLAGS` catalog
  (every flag the code may read, with its kind, owner, safe default and — for
  temporary flags — expiry), the pure evaluator (ordered rules, segments,
  semver targeting on the app build, deterministic MurmurHash3 percentage
  splits bucketed by organization), and the Zod schemas for targeting writes.
  `@flama/shared/feature-flags/catalog` is a Zod-free subpath for the web
  bundle. A `flags` scope group and a `FeatureFlag` subject join the catalogs.
- **`@flama/api`** gains a `feature-flags` module. Every replica holds all
  targeting in memory and evaluates without I/O, polling a cheap fingerprint
  to stay in sync and keeping its last good snapshot through a database blip.
  `GET /v1/feature-flags` serves the caller's evaluated client flags (signed
  out too); the control-plane endpoints under `/v1/feature-flags/admin`,
  `/segments` and `/changes` edit targeting, pull kill switches, manage
  segments, explain an evaluation and read the audit trail, which every change
  lands on through the outbox. `@RequireFlag('key')` gates a route on a flag,
  and token creation is now behind the `api_token_creation` kill switch. New
  error codes `FLAG_001`–`FLAG_007`. Migration `AddFeatureFlags`.
- **`@flama/frontend-core`**: a `feature-flags` kernel module and
  `useFeatureFlag` / `useFeatureFlagValue` / `useFeatureFlags`, typed by the
  catalog, reading the API rather than PostHog. Flags are prefetched as soon as
  the session is known, persisted with the query cache, and an `experiment`
  flag records a `feature_flag_exposed` event. `FlamaApp.create` takes
  `featureFlags: { platform, appVersion }`.

  **Breaking:** feature flags leave the analytics port. `IAnalyticsClient` no
  longer has `getFeatureFlags` / `onFeatureFlags`, `AnalyticsService` no longer
  serves flags, `analyticsKeys.flags` is gone, and `isFlagEnabled` moved to the
  `feature-flags` module. `useFeatureFlag(key)` keeps its name but now takes a
  catalog key and reads the server's answer.
- **`@flama/frontend-web` / `@flama/frontend-mobile`**: the PostHog adapters
  drop their flag methods and switch PostHog's own flag loading off. The mobile
  query client now follows `AppState`, so `refetchOnWindowFocus` works on a
  phone and a pulled kill switch lands when the app returns to the foreground.
  The unused `featureFlags` section of the mobile remote config is removed:
  remote config is for tunables, not flags.
- **`@flama/web` / `@flama/mobile`** report their platform and build, and the
  web API-tokens screen reads `api_token_creation`.

`pnpm check:flags` (in CI) fails on a temporary flag past its expiry date and
on a flag the catalog declares but no code reads.
