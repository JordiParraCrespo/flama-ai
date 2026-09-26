# @flama/frontend

## 0.3.0

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

- 7fdcefc: Capability registry: a missing optional key disables a feature instead of
  booting with a `'not-set'` sentinel.

  - `@flama/shared` exports `DEPLOYMENT_CAPABILITIES` / `DeploymentCapabilities`
    — the catalog of optional features a deployment may or may not have
    (`google_oauth`, `github_oauth`, `stripe_billing`, `s3_storage`,
    `email_delivery`), plus the `CLIENT_CAPABILITIES` wire subset.
  - `@flama/backend-core` gains a `CapabilitiesService` registry: the app
    resolves its capability set from config once at boot, logs it at startup,
    and every consumer asks the registry instead of comparing raw config against
    sentinel values.
  - The API's OAuth config keys are now genuinely optional
    (`z.string().optional()`) rather than defaulting to `'not-set'`; blank or
    whitespace-only env vars normalize to `undefined` across the optional
    OAuth/Stripe/S3/email keys. The client-facing subset of the resolved set
    (`CLIENT_CAPABILITIES`: the OAuth providers and `stripe_billing`) is served
    at `GET /health/capabilities` (exempt from scope checks, like other
    anonymous reads); server-internal capabilities stay in the startup log.
  - `@flama/api-client` picks up the generated `HealthApi.deploymentCapabilities()`.
  - `@flama/frontend-core` adds a `capabilities` module and a
    `useDeploymentCapabilities()` hook; the web login page uses it to render
    only configured social providers, and to name the env vars to set when none
    are (only after a successful read — an unreachable API or a failed refetch
    with retained stale data is not a missing configuration).

- af46e89: Bring every user-facing error into the RFC 7807 catalog.

  The organization and admin façades threw bare `HttpException`s carrying Better
  Auth's `{ message, code }` body, expecting the code to survive. It did not:
  `AllExceptionsFilter` reads a `code` from `AppError` alone, so ~46 call sites
  answered with a codeless problem document whose `title` was only the status
  phrase ("Conflict"). The auth guards had the same gap.

  - **`@flama/backend-core`** — new `ApiAuthProblemResponses()` documents the
    401/403 every guarded route can produce, applied once per controller class.
    A test now pins the deliberate rule that a bare `HttpException` carries no
    `code`.
  - **`apps/api`** — new `AuthErrors` (`AUTH_001`/`AUTH_002`), `OrganizationErrors`
    (`ORG_001`–`ORG_016`) and `AdminErrors` (`ADMIN_001`–`ADMIN_008`) catalogs.
    `betterAuthInvoker` folds Better Auth's ~85 upstream codes onto them, keeping
    the original as an `upstreamCode` extension member. Guards throw catalog
    errors instead of Nest's codeless ones; `PoliciesGuard` now reports a missing
    principal as 401 rather than 403.
  - **`@flama/translations`** — new `errors` namespace with a message per code in
    both locales, so clients stop rendering the server's English `detail`.
  - **`@flama/frontend-core`** — new `createErrorMessageResolver` translating a
    failure from its problem `code`.
  - **`@flama/frontend-consumer`** — the organizations repository no longer
    swallows a failed read into an empty list.
  - **`@flama/api-client`** — regenerated; the documented failures now reach the
    OpenAPI document.

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

- 510fb79: Add a shared TanStack Query cache-persistence policy.

  `@flama/frontend-core/react` now exports `defaultQueryClientOptions`,
  `createQueryPersistOptions` and `shouldDehydrateQuery`, which `apps/web` and
  `apps/mobile` feed to `PersistQueryClientProvider` alongside their platform
  persister (`localStorage` / `AsyncStorage`). The policy pins `gcTime` to the
  24h persist window (a garbage-collected query is never written to storage),
  busts the cache on app version, and keeps `auth` and `apiTokens` queries — plus
  anything that isn't a successful fetch — in memory only.

  `useSessionRestore` now reconciles the restored cache against the signed-in
  user (`reconcileCacheOwner`), dropping it when the session is gone or belongs
  to someone else, so a persisted cache can't outlive its session on a shared
  browser or device. `AuthService.restoreSession()` returns the restored user's
  id (or `null`) to make that possible.

- 2bbd591: Breaking: `profileQueryKey` is no longer exported from `@flama/frontend-core/react`; use `usersKeys.me()`. The capabilities query is keyed `['capabilities', 'deployment']` (was `['capabilities']`), and the persist revision is bumped to drop the old entry. `usersKeys.detail` takes `string | undefined` and `useUser` fetches with `skipToken` when there is no id. New `withCacheOnSuccess(options, update)`; every mutation hook uses it, so a caller's `onSuccess` no longer replaces the hook's cache update (logout clears the cache again). `useUpdateUser` writes the saved row to `detail(id)`, and to `me()` when it is the caller, and invalidates `lists()` instead of `all`; `useDeleteUser` removes `detail(id)`, removes `me()` and its permissions when the caller deleted themselves, and invalidates `lists()`. `MEMBER_LISTS_KEY` is unchanged.
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

- 07eb972: Serve every API error as an RFC 7807 problem document.

  `AllExceptionsFilter` now answers with `application/problem+json` and the
  standard members — `type`, `title`, `status`, `detail`, `instance` — plus the
  `code`, `correlationId`, `timestamp` and `invalidParams` extensions, instead of
  the ad-hoc `{ statusCode, code, message }` body.

  - **Title vs detail.** `AppError` takes a second argument: `detail` (specific to
    one occurrence) and `extensions` (extra members). The catalog message stays
    the stable problem `title`, so handlers no longer interpolate request data
    into it — `TOKEN_002` and `TOKEN_005` now report the offending scopes in
    `detail` and as `ungrantableScopes` / `missingScopes`.
  - **Validation failures** list every rejected field in `invalidParams`.
  - **Domain exceptions** from `@flama/backend-ddd` carry an `httpStatus`, so a
    `NotFoundException` surfaces as 404 rather than a blanket 500.
  - **5xx responses** no longer echo the underlying message; the correlation id
    ties the response to the logged stack trace.
  - `type` URIs point at the new error reference (`https://flama.dev/errors`),
    configurable per deployment with `ERROR_TYPE_BASE_URL`.

  The `ProblemDetails` wire type lives in `@flama/shared`, replacing the unused
  `ApiErrorResponse`. The CLI and MCP clients
  read problem documents (still understanding the old body shape),
  `@flama/frontend-core` exposes `toAppError` and the `@MapApiError` method decorator so screens can show
  the server's `detail` and per-field errors, and `ApiProblemResponse` puts the
  schema in the OpenAPI document and the generated client.

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

- e6895ae: Describe scope and permission-catalog responses properly in OpenAPI, so the
  generated client carries their real types.

  Several response DTOs described themselves loosely enough that the generated
  client lost the type and every consumer had to cast it back:

  - Scope arrays (`ApiTokenResponseDto.scopes`, `PermissionCatalogResponseDto.grantable`,
    `CurrentCredentialResponseDto.grantedScopes` / `effectiveScopes`) were declared
    `type: [String]` and generated as `string[]`. They now declare `enum: SCOPES`,
    so the client sees the same 20-member union the request DTO already used.
  - `PermissionCatalogResponseDto.groups` was an untyped object array and generated
    as `Record<string, any>[]`. The catalog now has real DTOs — `PermissionGroupDto`,
    `ScopeLevelsDto`, `ScopeLevelDto`, `ScopePolicyDto` — mirroring `PermissionGroup`
    from `@flama/shared`, so drift between the two becomes a compile error.
  - `GET /v1/users` declared no response schema at all and generated as `any`, taking
    the whole paginated list with it. It now returns `PaginatedUsersResponseDto`
    (with `PaginationMetaDto`).

  The wire format is unchanged — only its description. `@flama/frontend-consumer`'s
  api-tokens repository drops the casts this forced (including a `dto as never`
  that was disabling type checking on the create-token request body) and reads
  the generated DTOs directly. In `@flama/frontend-core`,
  `UsersRepository.findAll` / `UsersService.findAll` widen their `role` filter
  from `'admin' | 'user'` to `Role`, matching the database-backed roles the API
  actually accepts.

  The root `generate:openapi` script ran `nest build` from the repo root, where
  there is no Nest workspace, so `pnpm generate:api-client` always failed; it now
  delegates to `@flama/api`.

### Patch Changes

- Updated dependencies [755b293]
- Updated dependencies [548b754]
- Updated dependencies [7fdcefc]
- Updated dependencies [af46e89]
- Updated dependencies [4dbb193]
- Updated dependencies [c432cff]
- Updated dependencies [c27a7f4]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
- Updated dependencies [d532ef4]
- Updated dependencies [f96d51a]
- Updated dependencies [d06200f]
- Updated dependencies [e6895ae]
- Updated dependencies [48d1b41]
  - @flama/shared@1.0.0
  - @flama/api-client@1.0.0

## 0.2.0

### Minor Changes

- e209380: Add a CLI and an MCP server, both governed by granular per-credential
  permissions.

  Authorization gains a second layer. Roles say what a _person_ may do; **scopes**
  say what a _credential_ may do on their behalf, and the two are intersected on
  every request. A token can never be minted with more reach than its creator
  has, and revoking someone's role immediately narrows every credential they
  issued.

  - **`@flama/shared`**: the scope catalog — nine permission groups
    (profile, users, admin, roles, organizations, members, invitations,
    workspaces, tokens), each with a Read and an Edit level backed by the CASL
    rules it authorizes. Helpers for parsing, the write ⇒ read implication, the
    OAuth string form, and `grantableScopes`/`ungrantableScopes`, which enforce
    the "never exceed your creator" rule. Plus `ResourceScope` for per-organization
    narrowing, Zod schemas for token creation, and an `ApiToken` subject with
    own-token permissions on the seeded `user` role.

  - **`@flama/api`**: a new `api-tokens` DDD module (Better Auth 1.6 no longer
    ships an apiKey plugin). Only a SHA-256 digest of each secret is stored;
    tokens support expiry, IP allowlists and organization scoping, and are revoked
    rather than deleted. `ApiAuthGuard` replaces Better Auth's cookie-only guard
    and accepts a session cookie, an API token or an OAuth access token;
    `ScopesGuard` is registered globally and fails closed, so a route that
    declares no `@RequireScopes` cannot be reached by a token at all. The MCP
    plugin adds OAuth 2.1 discovery, dynamic client registration and a consent
    page. New endpoints: `GET|POST /v1/tokens`, `DELETE /v1/tokens/:id`,
    `GET /v1/tokens/permissions` and `GET /v1/me/credential`.

  - **`@flama/mcp`** (new): an MCP server exposing 26 tools over stdio and
    Streamable HTTP from one registry. Tools declare the scopes they need and the
    tool list is filtered by the credential's effective scopes, so an agent is
    never shown a capability that would be refused.

  - **`@flama/cli`** (new): `flama` — login that trades a session for a scoped
    token, token management with a permission catalog, users/roles/orgs/workspaces
    commands, `--json` output, profiles, and `flama mcp install` to connect an
    agent.

  - **`@flama/web`** / **`@flama/frontend`** / **`@flama/translations`**: a
    token-creation screen with a per-resource permission picker (levels you cannot
    grant are disabled) and an OAuth consent screen, backed by new `api-tokens`
    and `organizations` modules with TanStack Query hooks.

  Deploying runs a migration that adds the `api_token` and OAuth tables and grants
  every user permission over their own tokens. `pnpm generate:api-client` no
  longer needs a running database.

### Patch Changes

- a93cf5d: Refresh dependencies and pin the versions that must move together.

  Every package is updated within its semver range, plus a set of majors that
  carry no API change for this codebase: `@sentry/nestjs` 10, `pino-http` 11,
  `@bull-board/*` 8, `nodemailer` 9, `resend` 6, `inversify` 8,
  `dependency-cruiser` 18, `testcontainers` 12 and `@commitlint/*` 21.

  Three pins are added to `pnpm.overrides`, each for a resolution that the
  update would otherwise get wrong:

  - `react-native` — the mobile design system declares it as an unbounded
    `>=0.81.0` peer with no devDependency, so it re-resolved to 0.86 while both
    Expo apps pin 0.81.5. Two copies of React Native meant two incompatible
    copies of its types, and `@flama/design-system-mobile` stopped building.
  - `@nestjs/swagger` — 11.4.3 added an `exports` map that no longer exposes
    `dist/services/schema-object-factory`, which `nestjs-zod@4` deep-imports.
    Nothing catches this at build or test time; the API simply fails to boot.
    11.4.2 is the ceiling until the `zod` 4 / `nestjs-zod` 5 migration lands.

  Two unrelated robustness fixes in the auth layer, both found while verifying
  the upgrade against a live stack:

  - The standalone BullMQ email queue had no `error` listener. A queue is an
    EventEmitter, so a Redis restart or failover would raise an unhandled
    `error` event and take the API process down.
  - The `welcome` email enqueue in Better Auth's `user.create.after` hook was
    the only unguarded operation in a hook the surrounding code documents as
    best-effort. Better Auth does not await that hook, so a queue failure
    escaped as an unhandled rejection instead of being logged.

- 68348a6: Surface session-restore failures instead of silently logging the user out.

  Previously a transient network/server error during startup session restore was
  indistinguishable from being genuinely unauthenticated: `getSession()` swallowed
  the error as `null`, `useSessionRestore` ran with `retry: false` and no error
  handling, and both the web and mobile `AuthGate`s only branched on `isLoading` —
  so a single network blip bounced a logged-in user to `/login`.

  - **`@flama/frontend`**: `useSessionRestore` now retries transient failures
    (`retry: 2` with exponential backoff). A genuinely unauthenticated user still
    resolves successfully, so retries only fire on real errors.
  - **web/mobile auth clients**: `getSession()` now throws on transport/server
    errors instead of returning `null`, letting the query distinguish a failed
    lookup from an unauthenticated session.
  - **web/mobile `AuthGate`**: render a "connection problem" screen with a retry
    action on restore failure instead of falling through to `/login`.
  - **`@flama/translations`**: new `auth.session` strings (en + es).

- Updated dependencies [4943eff]
- Updated dependencies [e209380]
- Updated dependencies [55e1d1a]
- Updated dependencies [9c3e158]
- Updated dependencies [719859f]
  - @flama/shared@0.2.0
  - @flama/api-client@0.2.0
