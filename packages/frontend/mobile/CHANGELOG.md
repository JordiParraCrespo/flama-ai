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

- 132c189: Give the Expo apps the same sign-in screens as the web apps.

  `@flama/frontend-mobile` now owns the shared auth frame, forms, password
  controls, social providers, and forgot/reset flows used by both Expo apps.
  `@flama/design-system-mobile` adds the brand mark, and both apps receive the
  matching theme tokens, inline translated failures, and terminal success states.

### Patch Changes

- Updated dependencies [97f6f1e]
- Updated dependencies [23e7181]
- Updated dependencies [755b293]
- Updated dependencies [7fdcefc]
- Updated dependencies [af46e89]
- Updated dependencies [c27a7f4]
- Updated dependencies [510fb79]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
- Updated dependencies [d532ef4]
- Updated dependencies [d06200f]
- Updated dependencies [e6895ae]
- Updated dependencies [132c189]
- Updated dependencies [48d1b41]
  - @flama/design-system-mobile@0.3.0
  - @flama/frontend-core@0.3.0
  - @flama/shared@1.0.0
  - @flama/translations@0.3.0
