# @flama/frontend-mobile

## 0.2.0

### Minor Changes

- 23e7181: Add a pluggable analytics module with feature-flag support.

  `@flama/frontend-core` gains an `analytics` module following the same
  platform-adapter pattern as `storage` and `authClient`: an `IAnalyticsClient`
  port, an `AnalyticsService` that wraps every provider call so a failing SDK can
  never break the app, a typed event catalog, and a `NoopAnalyticsClient` used
  whenever no provider is configured.

  `FlamaApp.create()` takes an optional `analytics` adapter. The React entry point
  follows the same queries-and-mutations split as the other feature modules:
  `useFeatureFlags`, `useFeatureFlag`, `useFeatureFlagValue` and `analyticsKeys`
  for reads; `useCaptureEvent` and `useCapturePageView` for writes, with
  `useCaptureOnMount` and `usePageView` as convenience wrappers. `useAnalytics`
  remains for calls the module doesn't wrap. Sign-in, sign-up, sign-out and
  password-reset events are captured from `AuthService`, which also identifies the
  user on login and resets identity on logout.

  Feature flags are served through TanStack Query rather than a provider-specific
  subscription: an adapter implements a single async `getFeatureFlags()`, and
  caching, deduplication and refetching come from the query client. Providers that
  can push flag changes may also implement the optional `onFeatureFlags`, which
  invalidates the query when it fires.

  `@flama/frontend-web` and `@flama/frontend-mobile` ship the PostHog adapters,
  driven by `VITE_POSTHOG_KEY` / `EXPO_PUBLIC_POSTHOG_KEY`. Both default to the
  EU cloud region and are inert when unset.

- 4dbb193: Hold the frontend to its architecture, and move what both platforms need into
  the kernel.

  `@flama/frontend-core` gains `./format` (the `Intl` date helpers, moved from
  the web kit), `useLocale`, `useAbilityState`/`useAbility` (moved from the web
  kit's shell), `useRespondToConsent` with an optional
  `IAuthClient.respondToConsent`, `HookMutationOptions`, `personInitials` and
  `UserEntity.initials`. `usersKeys.list()` appends its params only when a facet
  is set. The web kit re-exports what moved, so `@flama/frontend-web` callers
  keep their imports.

  `@flama/frontend-consumer` gains `slugify`, `toCreateOrganizationDto` and
  `useAcceptInvitationAsNewcomer`; its mutation hooks type `options` as
  `HookMutationOptions`, so a caller can no longer pass a `mutationFn`.

  `@flama/frontend-web` gains `SectionNav` and `PasswordChecklist`; `i18n`
  becomes a middle concern. `@flama/frontend-mobile` gains `SignOutButton`,
  `ScreenErrorFallback` takes an optional title, message and retrying state, and
  `newPasswordSchema` moves to `@flama/shared/schemas/auth` (removed from the
  mobile kit's exports); `config` becomes a middle concern.

- c27a7f4: Port the rn-bedrock mobile stack into Flama: Expo SDK 57 + dev client, nitro-fetch, MMKV, Sentry/RevenueCat optional keys, gorhom sheet forks, Legend List, expo-image, nano-icons, hey-api client generation, and namespaced translation files.

  - `@flama/frontend-mobile` owns the shared mobile glue: the MMKV query
    persistence wrapper, the polyfills, `FormField` and SecureStore.
  - `@flama/frontend-core` gains `ConfigManager` under `@flama/frontend-core/config`.

- 6bf67a5: Adopt React Hook Form across `apps/web` and `apps/mobile`.

  Every auth form on both platforms now runs through `useForm`, validated against
  the Zod schemas in `@flama/shared` via `@hookform/resolvers`. Web forms were
  uncontrolled `FormData` reads leaning on native browser validation, and mobile
  screens held one `useState` per field and reported the first Zod failure in an
  `Alert`. Both now surface per-field errors inline, next to the input that caused
  them, and no longer submit until the whole form parses.

  `@flama/frontend-core` gains a `/validation` entrypoint exporting
  `createZodErrorMap`, and `@flama/frontend-web` and `@flama/frontend-mobile`
  each ship the `useZodResolver` hook that wires it into React Hook Form.
  The shared schemas carry English messages because the API validates against the
  same objects, so the map re-derives the message from the Zod issue code and
  resolves it against a `validation.*` translation key. Each app passes its own
  `t`, which keeps the messages localised without duplicating the schemas.
  `TranslateFn` is deliberately narrow — a `t` typed over the full catalog is
  assignable to it, so a missing key is a compile error rather than a raw key
  rendered to the user.

  The auth schemas in `@flama/shared` no longer hardcode their failure messages.
  Zod short-circuits any error map when a check states its own message, so
  `z.string().email('Invalid email address')` pinned every consumer to English. The
  shapes are unchanged, and nothing outside the two frontends read those strings —
  the API authenticates through Better Auth rather than these schemas.

  `@flama/shared` also adds a `./schemas/auth` export. `apps/web` could not import
  the schemas from the package root: that pulls in the scope catalog and CASL,
  neither of which belongs in the browser bundle. The narrow subpath depends on
  nothing but Zod. Because workspace `dist` folders sit outside `node_modules`,
  `apps/web/vite.config.ts` now points the CommonJS interop plugin and
  `optimizeDeps` at it — without that, Rollup cannot see the named exports.

  `@flama/translations` adds the `validation.*` messages the error map resolves
  (`required`, `email`, `minLength`, `maxLength`, `minItems`, `maxItems`) plus
  `apiTokens.permissionsRequired`, in both English and Spanish.

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

- Updated dependencies [97f6f1e]
- Updated dependencies [23e7181]
- Updated dependencies [755b293]
- Updated dependencies [548b754]
- Updated dependencies [7fdcefc]
- Updated dependencies [af46e89]
- Updated dependencies [4dbb193]
- Updated dependencies [c27a7f4]
- Updated dependencies [510fb79]
- Updated dependencies [2bbd591]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
- Updated dependencies [d532ef4]
- Updated dependencies [f96d51a]
- Updated dependencies [d06200f]
- Updated dependencies [e6895ae]
- Updated dependencies [132c189]
- Updated dependencies [48d1b41]
  - @flama/design-system-mobile@0.3.0
  - @flama/frontend-core@0.3.0
  - @flama/shared@1.0.0
  - @flama/translations@0.3.0
