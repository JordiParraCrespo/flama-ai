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
- Updated dependencies [7fdcefc]
- Updated dependencies [af46e89]
- Updated dependencies [c27a7f4]
- Updated dependencies [510fb79]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
- Updated dependencies [d532ef4]
- Updated dependencies [d06200f]
- Updated dependencies [e6895ae]
- Updated dependencies [48d1b41]
  - @flama/design-system-web@0.2.0
  - @flama/frontend-core@0.3.0
  - @flama/shared@1.0.0
  - @flama/translations@0.3.0
