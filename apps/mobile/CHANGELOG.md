# @flama/mobile

## 0.2.0

### Minor Changes

- c27a7f4: Port the rn-bedrock mobile stack into Flama: Expo SDK 57 + dev client, nitro-fetch, MMKV, Sentry/RevenueCat optional keys, gorhom sheet forks, Legend List, expo-image, nano-icons, hey-api client generation, and namespaced translation files.

  - `@flama/frontend-mobile` owns the shared mobile glue: the MMKV query
    persistence wrapper, the polyfills, `FormField` and SecureStore.
  - `@flama/frontend-core` gains `ConfigManager` under `@flama/frontend-core/config`.

- f96d51a: Add server-evaluated feature flags, wired into the API, web and mobile.

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

- 132c189: Give the Expo apps the same sign-in screens as the web apps.

  `@flama/frontend-mobile` now owns the shared auth frame, forms, password
  controls, social providers, and forgot/reset flows used by both Expo apps.
  `@flama/design-system-mobile` adds the brand mark, and both apps receive the
  matching theme tokens, inline translated failures, and terminal success states.

### Patch Changes

- 28b2d1b: Extract the Better Auth configuration both sides must agree on into a new `@flama/auth` package: the user-fields schema (consumed by the server's `user.additionalFields` and the clients' `inferAdditionalFields`), the shared client plugin set (`admin`, `organization` with the `teams` flag), and the `unwrap()` / `toAuthSession()` helpers previously copy-pasted into both client adapters. The `./client` entry ships TypeScript sources to preserve Better Auth's type inference; the root entry is compiled CJS for the NestJS API.
- b0d0d25: Mount the root navigator before applying authentication guards so the mobile
  app can start without Expo Router throwing an early-navigation error. Session
  loading and restore failures remain visible as full-screen overlays. Refresh
  the login screen with the Flama auth layout, theme control, session preference,
  and deployment-aware social login options.
- 25ff19f: One `.env` at the repo root, documented by a root `.env.example`.

  New `@flama/env` package locates the workspace root (walking up to
  `pnpm-workspace.yaml` or a `package.json` with `workspaces`), loads `.env`
  then `.env.local` (local wins between the files), and never overwrites a
  value already in `process.env` — real environment variables always win, so
  the same loader is correct in CI and in production containers.

  - `apps/api` entry points (`main.ts`, TypeORM CLI `data-source.ts`, seed,
    OpenAPI generation, `auth.ts`) import `@flama/env/load` instead of
    `dotenv/config`, which resolved `.env` against `process.cwd()`. The TypeORM
    CLI previously loaded no env file at all.
  - `apps/web` reads the root file via Vite's `envDir`; a `.env` inside the app
    directory is no longer read.
  - `apps/mobile` loads the root file in `app.config.ts` before Metro bundles,
    and its deep-link `scheme` now reads `MOBILE_SCHEME` — the same variable the
    API uses for its trusted origin — instead of a hardcoded copy.
  - `apps/mcp` entry points load the root file too (a no-op outside a
    workspace), and the HTTP port now prefers `MCP_PORT` over `PORT` so a shared
    root `.env` can't make it collide with the API.
  - Stale variables removed: the `JWT_SECRET` fallback for `BETTER_AUTH_SECRET`
    and `JWT_REFRESH_SECRET` / `NEXT_PUBLIC_API_URL` in
    `docker/docker-compose.prod.yml` (which now passes `BETTER_AUTH_SECRET` /
    `BETTER_AUTH_URL`); `SENTRY_DSN` / `EXPO_PUBLIC_SENTRY_DSN` were documented
    but never read and are not carried over.

  The three per-app `.env.example` files are replaced by a single root
  `.env.example` documenting every variable the repo reads.

- Updated dependencies [97f6f1e]
- Updated dependencies [23e7181]
- Updated dependencies [755b293]
- Updated dependencies [548b754]
- Updated dependencies [7fdcefc]
- Updated dependencies [af46e89]
- Updated dependencies [28b2d1b]
- Updated dependencies [4dbb193]
- Updated dependencies [c432cff]
- Updated dependencies [c27a7f4]
- Updated dependencies [be7a583]
- Updated dependencies [510fb79]
- Updated dependencies [2bbd591]
- Updated dependencies [2bbd591]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
- Updated dependencies [d532ef4]
- Updated dependencies [f96d51a]
- Updated dependencies [25ff19f]
- Updated dependencies [d06200f]
- Updated dependencies [e6895ae]
- Updated dependencies [132c189]
- Updated dependencies [48d1b41]
  - @flama/design-system-mobile@0.3.0
  - @flama/frontend-core@0.3.0
  - @flama/frontend-mobile@0.2.0
  - @flama/shared@1.0.0
  - @flama/api-client@1.0.0
  - @flama/translations@0.3.0
  - @flama/frontend-consumer@1.0.0
  - @flama/auth@0.2.0
  - @flama/env@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [4943eff]
- Updated dependencies [e209380]
- Updated dependencies [a93cf5d]
- Updated dependencies [55e1d1a]
- Updated dependencies [9c3e158]
- Updated dependencies [68348a6]
- Updated dependencies [719859f]
  - @flama/shared@0.2.0
  - @flama/frontend@0.2.0
  - @flama/api-client@0.2.0
  - @flama/translations@0.2.0
