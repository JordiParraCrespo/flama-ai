# @flama/frontend-web

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

- 396c114: Put everything before the console under one `_auth` layout, and let each route
  say for itself who may reach it.

  `_auth` used to be chrome _and_ a gate: it mounted `AuthLayout` and called
  `redirectSignedIn`, so every route beneath it had to be a signed-out route.
  Two things did not fit. `accept-invitation` is reachable by a signed-out
  invitee _and_ a signed-in one, which the guard handled with an exception —
  `allow: ['/accept-invitation']`. And `/onboarding`, which only a signed-in
  account should see, could not live under that layout at all, so it sat outside
  with its own copy of the layout's chrome.

  Now `_auth` renders and guards nothing, and its three children each answer for
  themselves: `_auth/_public.tsx` turns signed-in visitors away,
  `_auth/onboarding.tsx` turns signed-out ones away, and
  `_auth/accept-invitation.tsx` carries no guard because both are legitimate
  there.

  **`redirectSignedIn` drops its `allow` parameter.** An exception list beside a
  guard is a second copy of the tree and can drift from the paths it names; a
  route both readers may open belongs under a parent that guards nobody, which
  cannot. Nothing passed `allow` any more, and leaving it exported is how the
  next route that "does not fit" gets appended to it instead of placed.

  **`redirectSignedOut` joins it**, so the pair is symmetric. Three routes had
  each written the signed-out bounce inline — both apps' `_authenticated` and
  the onboarding step — and with it the `/login` target and the reason it sends
  `location.href` rather than `location.pathname`. Now a route picks one guard,
  the other, or neither.

  The onboarding screen had hand-rolled the auth column: the same padding, the
  same theme toggle in the same corner, the same 400px measure. It renders in
  the real layout now and its wrapper is a fragment.

  Every URL is unchanged — `/login`, `/register`, `/forgot-password`,
  `/reset-password`, `/accept-invitation` and `/onboarding` all resolve exactly
  as before.

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

- aae7787: Stop paying for render coupling the React Compiler was hiding.

  `DataTable` was one 624-line component holding the search field, the selection,
  every row and the pager — three things on three different clocks, so each one's
  update redrew the other two. Measured, a keystroke re-rendered all eight rows of
  the roles table, for a query that was debounced anyway and had not been asked
  yet. It is now a shell over a header, a body, a row, a footer and a search field
  that keeps the half-typed word itself and commits once per burst: zero rows per
  keystroke.

  `useTableQuery` loses its own debounce, an effect, and the `searchQuery` alias
  with it. One `search`: the settled value, which seeds the field and which a
  request reads. The URL write is no longer debounced either — a second delay on
  the way out lands after the reader has typed on, and the field would take its
  own late echo as news and snap the caret string back.

  `*-render.spec.tsx` files run in a second vitest project with the compiler
  switched off, where this kind of regression is visible at all; the two projects
  are shared from `@flama/tsconfig/vitest-frontend.mjs` so a package cannot set up
  half of them. `pnpm check:structure` gained one check — a query subscribed to
  only so a single sibling can render it.

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

### Patch Changes

- d06200f: Name the config package after what it holds, and put the endpoint policies next
  to CASL.

  `@flama/config` is now `@flama/tsconfig`, in `packages/tsconfig/`. "Config" said
  nothing — the repo has seven other things that answer to it (`src/config/` in
  the API, `ShellConfig`, `vite.config.ts`, the root `.env`) — while the package
  holds tsconfig presets and the two build-time helpers that travel with them
  (`vite-chunks.mjs`, `depcruise/*.cjs`). Every `extends`, devDependency,
  Dockerfile `COPY` and doc reference moved with it; nothing else changed.

  `@flama/shared` no longer exports `./navigation`. `SCREENS` paired a web route
  (`/team`, `/api-tokens`) with the endpoint behind it and the rules that endpoint
  demands. The endpoint half is a real contract and stays, as `ENDPOINT_POLICIES`
  in `@flama/shared/permissions` — keyed by the path Nest mounts the handler at,
  which is what `apps/api/src/auth/__tests__/endpoint-policies.spec.ts` (renamed
  from `screen-policies.spec.ts`) pins the controllers to.

  The route half is deleted rather than rehoused. Those five paths are not routes
  any app mounts: `apps/web` serves `/dashboard`, `/settings` and
  `/settings/api-tokens`, `apps/admin-web` serves `/users` and `/roles`, and
  neither read the catalog — both nav files write their rows out by hand. A list
  of one product's leftover URLs does not earn a home in the platform kit both
  Vite apps compile. The rule that survives is smaller and is now what the docs
  say: a gated nav row takes `policies: ENDPOINT_POLICIES['/tokens']` where the
  row is declared, never a literal rule list, and the route string stays in the
  app that mounts it.

  The catalog also carries its own invariants now. `ENDPOINT_POLICIES` is typed
  `Record<string, readonly [EndpointPolicy, ...EndpointPolicy[]]>`, so an empty
  rule list and a misspelled member are both compile errors — which is what the
  package-local spec was asserting at runtime, so it is gone. `HANDLERS` in the
  API test is a `Record<GuardedEndpoint, …>`, so a new catalog entry fails to
  compile until a handler is named for it. Nothing casts.

  `permissions/index.ts` became a barrel over `abilities.ts` (a verbatim move of
  the old file) and `endpoint-policies.ts`.

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
- Updated dependencies [48d1b41]
  - @flama/design-system-web@0.2.0
  - @flama/frontend-core@0.3.0
  - @flama/shared@1.0.0
  - @flama/translations@0.3.0
