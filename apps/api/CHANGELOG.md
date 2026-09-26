# @flama/api

## 1.0.0

### Major Changes

- 548b754: Stripe billing leaves the starter for the `billing` plugin, and the `leads`
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

- d532ef4: Enforce conditional User permissions against the loaded record before reading
  or updating it. Listing the global user directory now requires `manage User`.
  The shared `canAccess()` helper performs the instance-level check.

  Preserve the default role's existing restrictions: it has no platform User
  grants, and self-service edits go through `/profile`. The existing
  `TightenDefaultUserRole` migration already removes unconditional User grants;
  no earlier scoping migration is introduced, as that would cause those grants
  to survive the later tightening migration. Explicit conditional grants remain
  supported, and profile update schemas continue to exclude `role`.

  Non-admin callers that previously listed users with only `read User` now
  receive 403; organization-scoped member endpoints cover tenant directories.

### Minor Changes

- 755b293: Add the authorization kernel: a feature module declares one resource object and
  gets tenant isolation, team scoping, row-level SQL filtering, a role-builder
  entry and a credential scope without writing an authorization check.

  Also closes two defects in the existing system: `PoliciesGuard` allowed any
  authenticated caller through a route that declared no policy, and roles were
  global (`role.name` was unique table-wide), so two tenants could not both define
  a `manager` role.

- cbc0b25: Foreign keys, indexes and a unique provider-account key on Better Auth's `session`, `account` and `verification` tables, and `timestamptz` for every timestamp column; large databases run `apps/api/db/ops/1788900000000-harden-auth-tables.sql` first.
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

- 71c0597: Make the API's Domain-Driven Hexagon layout a contract a machine enforces,
  rather than a description a module can drift away from.

  `apps/api/ARCHITECTURE.md` already described the hexagon well. Nothing checked
  the _shape_ of a module against it, so the shape had gone its own way: four
  modules had grown a `services/` bucket, `auth/` kept persistence models in
  `entities/` and its Better Auth instance in a bare `auth.ts`, five modules left
  loose files at their root, and two carried 500-line services behind multi-route
  controllers. Dependency-cruiser only ever policed the _direction_ of imports —
  a file in the wrong layer with the right imports passed.

  **One shape, no empty directories.** Every module is cut the same way. A
  directory appears when it has something to hold — a module with no aggregate
  has no `domain/`, not an empty one — but the set of directories is closed and
  each admits a fixed set of file names:

  | Directory                                          | Admits                                                                                                  |
  | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
  | `domain/`                                          | `*.entity.ts`, `*.errors.ts`, `*.policy.ts`, `*.factory.ts`, `*.types.ts`, `value-objects/`, `events/`  |
  | `database/`                                        | `*.orm-entity.ts`, `*.repository.port.ts`, `*.repository.ts`                                            |
  | `infrastructure/`                                  | `*.port.ts`, `*.adapter.ts`, `*.gateway.ts`, `*.processor.ts`, `*.config.ts`, `*.util.ts`, `*.types.ts` |
  | `commands/<use-case>/`, `queries/<use-case>/`      | the message, its handler, the controller, the request DTO                                               |
  | `application/`                                     | `*.factory.ts`, `*.policy.ts`, `*.resolver.ts`, `*.port.ts`, `event-handlers/`                          |
  | `dtos/`, `guards/`, `decorators/`, `interceptors/` | the one kind each is named for                                                                          |
  | `probes/`                                          | `*.probe.controller.ts`, `*.indicator.ts`                                                               |

  The command handler is `<use-case>.command-handler.ts`, matching
  `<use-case>.query-handler.ts`. It used to be `<use-case>.service.ts`, which was
  the dissolved bucket surviving as a suffix — the contract cannot forbid a
  `services/` directory and then require every handler to be named after one.

  A **probe is not a use case.** `/health`, `/ready` and `/health/capabilities`
  report on the process, have no command or query behind them and never will, so
  they have a shape of their own rather than owing three slices they would leave
  empty.

  The module root carries only `<module>.module.ts`, `*.mapper.ts`,
  `*.di-tokens.ts` and `*.resource.ts`.

  **There is no `services/`.** That is the change with the most reach, because a
  "service" is not a layer and a directory named after one is where a module goes
  to stop being a hexagon. Every one of them was dissolved into the thing it
  actually was: `roles/services/ability.factory.ts` and `role-grant.policy.ts`
  became `roles/application/`, the authz and profile resolvers became
  `application/` too, and what really talked to something outside the process
  became an adapter — `profile/services/avatar.storage.ts` →
  `profile/infrastructure/avatar-storage.adapter.ts`,
  `profile-auth.facade.ts` → `profile-auth.gateway.ts`,
  `auth/services/delegated-session.service.ts` →
  `auth/infrastructure/delegated-session.adapter.ts`.

  The same question was put to every other file that had no layer in its path.
  `auth/entities/*.entity.ts` were TypeORM models, so they are now
  `auth/database/*.orm-entity.ts`; `auth/auth.ts` is
  `auth/infrastructure/better-auth.config.ts`; `queue/email.processor.ts`,
  `throttling/redis-throttler.storage.ts`, `health/redis-health.indicator.ts` and
  `outbox/outbox-relay.service.ts` moved into their modules' `infrastructure/`;
  `users/user-access.ts` became `users/application/user-access.policy.ts`;
  `api-tokens/domain/ip-allowlist.ts` and `api-token.secret.ts` became a
  `*.policy.ts` and a `*.factory.ts`. `auth/scope-context.ts` was sitting in
  `domain/` while importing `express`, which is exactly the impurity the domain
  rule exists to catch — it kept its place once the express dependency went (see
  below). Specs were renamed to follow their subjects. Every relative import, the
  TypeORM datasource, the seed and each `vi.mock()` path moved with them.

  **`scripts/check-api-structure.mjs`** (`pnpm check:api-structure`) is that table,
  executable. Beyond the directory and file-name sets it holds four rules that
  decay first: a use case is a directory and every file in it carries its name; a
  message and its handler come as a pair; an HTTP route is declared in a use-case
  controller and nowhere else; and a controller is capped at 110 lines, a handler
  at 120. Each dissolved bucket name reports the question to ask instead of the
  bucket.

  **`.dependency-cruiser.cjs`** gains five rules alongside the existing ones: a
  controller goes through the bus and never reaches into `database/` at runtime;
  TypeORM stays in `database/` and `infrastructure/`; Better Auth is an external
  system reached through an adapter; a use-case slice does not import another
  slice's internals; and a module publishes only its domain, DTOs, ports, DI
  tokens, bus messages and inbound adapters — its handlers, mappers and concrete
  adapters are its own. `handlers-depend-on-port-not-adapter` now covers
  `*.adapter.ts` and `*.gateway.ts`, not just `*.repository.ts`.

  **Every adapter has a port.** Six of them — `AvatarStoragePort`,
  `ProfileAuthPort`, `LocaleResolverPort`, `DelegatedSessionPort`,
  `CredentialScopePort` and `CredentialVerifierPort` — each with a DI token the
  composition root binds. Handlers and guards inject the token and name the port;
  `profile.module.ts` and `auth.module.ts` export tokens, never classes. Moving a
  file into `infrastructure/` is not what makes it an adapter, and a checker
  taught to look away is not a ledger.

  That last port is what gives `better-auth-stays-behind-an-adapter` its teeth.
  The rule matched `node_modules/better-auth`, which nothing imports directly —
  everything imports `auth` from `better-auth.config.ts`, so the rule was
  vacuously true. It now covers the configured instance, and
  `CredentialScopeResolver` asks a `CredentialVerifierPort` instead of calling
  `auth.api.getMcpSession` from the application layer.

  `ScopedRequest` no longer extends express's `Request`. That import was the only
  reason it sat in `infrastructure/`, and it forced six use-case controllers to
  depend on an adapter layer — which is what had made a
  `^src/auth/infrastructure/` wildcard on the cross-module surface look
  necessary. It is structural and node-core only, back in `domain/`, and the
  wildcard is gone.

  **Known violations are a ledger, not an exemption.** `admin/` and
  `organizations/` are the pre-contract Better Auth façades — a root-level service
  and multi-route controllers across 42 routes. Rather than weaken the checks for
  them, each outstanding violation is listed as a `(path, kind)` pair: the prose
  is output, never identity, so rewording a message can neither silence a
  violation nor invent a stale one. Nothing else in those modules is excused, a
  new violation in them still fails, and an entry that stops matching is itself an
  error. `apps/api/AGENTS.md` says what to do when you touch them: a new operation
  goes in as a slice, never onto the old service.

  **The checker has its own test suite.** `scripts/check-api-structure.test.mjs`
  builds trees for the purpose and pins the `kind` each breach reports, including
  two fixtures over the ledger mechanism itself. Running a checker only over the
  repository says whether the repository conforms today; it cannot exercise a rule
  nothing currently breaks.

  Not owning the data turns out to be a reason to have a port, not a reason to
  skip the contract, and the docs now say so. `ARCHITECTURE.md`'s "what is
  intentionally NOT full DDD" section is replaced by "modules that own no
  aggregate", which describes the port-plus-gateway-plus-slices shape those
  façades are migrating to.

  The contract table lives in **one** place. `.agents/rules/nestjs-architecture.md`
  and the `/scaffold-module` skill point at `ARCHITECTURE.md` and keep only what
  is local to them, and `apps/docs/docs/architecture/api-architecture.md` — which
  still described `auth/auth.ts`, `users/services/`, a three-layer mapper and an
  event bus with no outbox — was rewritten against it. CI runs `pnpm check:api-structure` in the
  lint job and the Claude Code Stop hook runs it whenever a task touches
  `apps/api/src`.

- 9cf59be: Add a transactional outbox so domain events and queued jobs can no longer be
  silently lost between a database commit and their delivery.

  Previously repositories emitted domain events through `EventEmitter2` after the
  write, and queued jobs went to BullMQ/Redis outside the Postgres transaction —
  so a listener crash, a Redis blip, or a process killed between commit and
  dispatch dropped the side effect with no record it was ever owed.

  `@flama/backend-ddd` gains outbox building blocks alongside the existing
  aggregate/domain-event bases:

  - `OutboxMessageSchema` — a decorator-free `EntitySchema` for the new
    `outbox_message` table. `aggregateId` is a plain column with no foreign key,
    deliberately, so the queue outlives the records it names. Every row carries a
    human-readable `reason` so a queued item is self-explaining.
  - `OutboxService` — `stageEvents` / `stageJob` write rows **inside the caller's
    TypeORM transaction**, atomically with the aggregate write; `claim` leases due
    rows with `FOR UPDATE SKIP LOCKED` so multiple API replicas lease disjoint
    rows; leases expire (`lockedUntil`), so work owned by a dead process is
    reclaimed rather than stuck; failures retry with exponential backoff and park
    as `failed` after `maxAttempts` instead of disappearing.
  - `OutboxRelay` — the drain loop: a post-commit wake keeps happy-path latency at
    in-process levels, and a background poll is the crash-recovery safety net.
  - `DomainEvent` accepts an optional `reason` prop, recorded on the outbox row.

  `apps/api` wires it up: an `AddOutbox` migration, a global `OutboxModule`, and
  an `OutboxRelayService` that re-emits `event` rows on `EventEmitter2` (keyed by
  event class name, so existing `@OnEvent` handlers are unchanged — they now
  receive the deserialized payload rather than the class instance) and hands
  `queue` rows to the named BullMQ queue. The user, role, API-token and
  subscription repositories stage their aggregates' events through the outbox
  instead of emitting them directly.

  This does not replace BullMQ — it sits in front of it and closes exactly the
  `commit(); enqueue();` atomicity gap BullMQ cannot.

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

- 28b2d1b: Extract the Better Auth configuration both sides must agree on into a new `@flama/auth` package: the user-fields schema (consumed by the server's `user.additionalFields` and the clients' `inferAdditionalFields`), the shared client plugin set (`admin`, `organization` with the `teams` flag), and the `unwrap()` / `toAuthSession()` helpers previously copy-pasted into both client adapters. The `./client` entry ships TypeScript sources to preserve Better Auth's type inference; the root entry is compiled CJS for the NestJS API.
- b079e83: Logging hardening: `LoggingModule` in `@flama/backend-core` wraps `nestjs-pino`
  with hardened defaults — request log lines carry only known-safe fields (no
  headers, query strings, or bodies; credential headers redacted as a backstop) —
  and registers `UserContextInterceptor`, which attaches `userId` and the
  credential's effective scopes to the request log context once the auth guards
  resolve. `createAuthRouteLoggingMiddleware` brings the Better Auth
  `/api/auth/*` routes (mounted ahead of Nest's middleware) into the request log
  via the `middleware` option of `@thallesp/nestjs-better-auth`. The API also
  gains opt-in SQL query logging (`DB_LOG_QUERIES=true`) that never logs bound
  parameters.
- c432cff: `GET /v1/organizations/:orgId/members/me` answers for the organization in the
  path, not the session's active one, and organization-scoped routes are
  authorized by the caller's roles in the path's organization. The client
  method is now `getMembership(orgId)` (the SDK's `getMembership({ path: { orgId } })`),
  with `orgId` required.
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

- Updated dependencies [755b293]
- Updated dependencies [548b754]
- Updated dependencies [7fdcefc]
- Updated dependencies [af46e89]
- Updated dependencies [28b2d1b]
- Updated dependencies [4dbb193]
- Updated dependencies [b079e83]
- Updated dependencies [c27a7f4]
- Updated dependencies [be7a583]
- Updated dependencies [cbc0b25]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
- Updated dependencies [d532ef4]
- Updated dependencies [f96d51a]
- Updated dependencies [25ff19f]
- Updated dependencies [9cf59be]
- Updated dependencies [d06200f]
- Updated dependencies [48d1b41]
  - @flama/backend-authz@0.2.0
  - @flama/shared@1.0.0
  - @flama/translations@0.3.0
  - @flama/backend-core@0.3.0
  - @flama/auth@0.2.0
  - @flama/backend-ddd@0.3.0
  - @flama/env@0.2.0
  - @flama/backend-cache@0.1.0
  - @flama/backend-email@0.2.0
  - @flama/backend-i18n@0.1.0
  - @flama/backend-queue@0.1.1
  - @flama/backend-storage@0.1.0

## 0.2.0

### Minor Changes

- 4943eff: Add Better Auth admin (super-admin) and organization (with workspaces) plugins.

  Authentication already ran on Better Auth; this enables its official `admin` and
  `organization` plugins and wires them into the app, plus organization-scoped
  CASL authorization.

  - **`@flama/api`**: enable the `admin` plugin (super-admin: list/ban/impersonate
    users, set roles, revoke sessions — gated by the new `superadmin`/`admin`
    roles and `BETTER_AUTH_ADMIN_USER_IDS`) and the `organization` plugin
    (organizations, members, invitations, and **workspaces** via teams). New users
    get a personal organization + default workspace on sign-up; sessions carry
    `activeOrganizationId` / `activeTeamId`. Adds ORM entities + a migration for
    `organization`/`member`/`invitation`/`team`/`teamMember`, the admin columns
    (`user.banned`/`banReason`/`banExpires`, `session.impersonatedBy`), and a
    seeded `superadmin` system role. `PoliciesGuard`/`AbilityFactory` now thread
    `session.activeOrganizationId` into CASL so permissions can be org-scoped with
    `${activeOrganizationId}` conditions. System roles that grant `manage all` are
    protected from being stripped of it (admin-lockout guard).

  - **`@flama/shared`**: new `superadmin` system role and `ORGANIZATION_ROLES`;
    new Zod schemas/types for organization, member, invitation, workspace, and
    admin operations; `activeOrganizationId` / `activeTeamId` added to the CASL
    ability context; new `Organization`/`Workspace`/`Member`/`Invitation`/
    `AuditLog` known subjects. Removes the vestigial `JwtPayload`, `TokenPair`,
    `AuthProvider` types and the unused `AUTH` token-expiry constants.

  - **`@flama/backend-email`**: new `EmailService.sendInvitation` + invitation
    React Email template, sent asynchronously through the email queue.

  After deploying, run the migration (`pnpm --filter @flama/api migration:run`).
  The organization/admin operations are exposed to the frontend through the Better
  Auth `organizationClient()` / `adminClient()` plugins (already wired into the web
  and mobile auth clients), not the generated api-client.

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

- aa0eefd: Refactor the API toward Domain-Driven Hexagon architecture.

  - Add `@flama/backend-ddd`, a building-blocks package with `Entity`,
    `AggregateRoot`, `ValueObject`, `DomainEvent`, `CommandBase`, `QueryBase`,
    the `RepositoryPort`/`Paginated` abstractions, a domain/persistence/response
    `Mapper` interface, domain exceptions and `Guard`.
  - Restructure the users module into vertical slices (`commands/`, `queries/`,
    `domain/`, `database/`, `dtos/`, `application/`) on top of `@nestjs/cqrs`,
    with a `UserEntity` aggregate, an `Email` value object, a
    `UserRepositoryPort` and its TypeORM adapter, and domain-event publishing.
  - Invert the `@flama/backend-ddd` ↔ `@flama/backend-core` layering: the
    framework-free `RequestContextService` and the `ErrorDefinition` contract now
    live in `@flama/backend-ddd` (re-exported from `@flama/backend-core` for
    backwards compatibility), so the domain layer depends on no infrastructure.
  - Document the architecture in `apps/api/ARCHITECTURE.md`, add a
    `/scaffold-module` skill, and enforce the layer boundaries with
    dependency-cruiser (`pnpm arch`, wired into CI and a Stop hook).

- 55e1d1a: Add database-backed, admin-managed roles (dynamic RBAC).

  Roles and their permissions now live in the database instead of a hardcoded
  `defineAbilitiesFor(role)` switch, and admins can manage them through the API.

  - **`@flama/shared`**: `Actions`/`Subjects` are now free-form strings; new
    `PermissionDefinition` type (with `conditions` for resource scoping, `fields`,
    `inverted`); new `defineAbilitiesFromPermissions(permissions, { user })` that
    builds a CASL ability from a flat permission list and interpolates
    `${user.id}`-style condition placeholders; new role Zod schemas
    (`createRoleSchema`, `updateRoleSchema`, `updateRolePermissionsSchema`,
    `assignUserRolesSchema`, `permissionSchema`); `SYSTEM_ROLE_PERMISSIONS` and
    `SYSTEM_ROLES`. `Role` is now `string` (roles are dynamic).

  - **`@flama/api`**: new `roles` Domain-Driven Hexagon module with a `RoleEntity`
    aggregate owning `Permission` value objects (stored as `jsonb`) and a
    `user_role` join enabling **multiple roles per user**. Endpoints (admin-only):
    `POST/GET/PATCH/DELETE /roles`, `PUT /roles/:id/permissions` (granular
    permission editing), and `GET/PUT /users/:userId/roles`. The `PoliciesGuard`
    now resolves a user's effective ability from the union of their assigned
    roles' permissions via a new `AbilityFactory` (falling back to the legacy
    `user.role` column). Adds a migration that creates the `role`/`user_role`
    tables, seeds the `admin`/`user` system roles, and backfills existing users;
    new sign-ups are assigned the default `user` role.

  After deploying, run `pnpm generate:api-client` against a running API to
  regenerate the typed client with the new `/roles` endpoints.

- 9c3e158: Add first-class REST modules for organizations, members, invitations, workspaces
  and admin (super-admin) — delegating façades over the Better Auth plugins.

  These expose the Better Auth organization/admin plugin operations as typed,
  Swagger-documented, CASL-guarded NestJS endpoints so they appear in the generated
  `@flama/api-client` (the plugins' own `/api/auth/*` endpoints are not NestJS
  controllers and never did). The controllers/services delegate to `auth.api.*`
  (via `auth/better-auth.util.ts`) rather than writing the Better-Auth-owned tables,
  so Better Auth remains the single source of truth — no domain duplication.

  - **`@flama/api`**: new `organizations` module — `OrganizationsController`
    (`/v1/organizations`: create/update/delete/set-active/list/get-full/check-slug),
    `MembersController` (`/v1/organizations/:orgId/members`: list/add/remove/
    update-role/active/leave), invitation controllers (`/v1/organizations/:orgId/
invitations` + self-service `/v1/invitations/:id/accept|reject|cancel`, list),
    and `WorkspacesController` (`/v1/workspaces`: create/update/remove/set-active/
    list/mine/members/add-member/remove-member). New `admin` module —
    `/v1/admin/users` (list/get/create/update/set-role/ban/unban/impersonate/
    stop-impersonating/remove/sessions/revoke/set-password), gated by `manage User`;
    impersonation forwards Better Auth's `Set-Cookie`.

  - **`@flama/shared`**: added request schemas/types for the above (check-slug,
    add-member, update-member-role, add-workspace-member, and body-only admin
    variants: create/update user, set-role, ban, set-password).

  Run `pnpm generate:api-client` against a running API to regenerate the typed
  client with the new endpoints.

- 719859f: Add a Stripe billing module for subscriptions and revenue.

  - **`@flama/shared`**: billing Zod schemas and types (`createCheckoutSchema`,
    `createPortalSchema`, subscription + revenue-metrics response schemas,
    `SubscriptionStatus`, `BillingInterval`), and a `Billing` known subject.
  - **`apps/api`**: a new `billing` Domain-Driven Hexagon module with a
    `Subscription` and `BillingCustomer` aggregate, a Stripe `PaymentGatewayPort`
    - adapter, and endpoints:
    * `POST /v1/billing/checkout` — start a Stripe Checkout session
    * `POST /v1/billing/portal` — open the Stripe Customer Portal
    * `POST /v1/billing/webhook` — signature-verified subscription sync
    * `GET /v1/billing/subscription` — the caller's current subscription
    * `GET /v1/billing/subscriptions` — admin, paginated (RBAC `read Billing`)
    * `GET /v1/billing/metrics` — admin revenue metrics (MRR/ARR/churn)

    Subscription state is mirrored locally from webhooks; revenue metrics are
    computed from that table (no live Stripe reads). Adds the `subscription` and
    `billing_customer` tables via migration and enables Better Auth's raw-body
    parser so Stripe webhook signatures can be verified.

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

- a2998c6: Harden the Stripe billing webhook and gateway error handling.

  - **Out-of-order deliveries**: Stripe does not guarantee webhook ordering, so a
    late `subscription.updated` arriving after `subscription.deleted` could
    resurrect stale state. `SubscriptionEntity` now records the `created`
    timestamp of the last event it applied (`lastEventAt`) and discards anything
    older. Same-second events are still applied — Stripe's `created` has second
    resolution and re-applying identical data is idempotent.
  - **Concurrent duplicate deliveries**: the check-then-insert in the webhook
    handler is not transactional, so two simultaneous deliveries could race
    between the lookup and the insert and surface an unmapped 500. A unique
    violation is now caught and reconciled against the row that won the race.
  - **`sync()` returns whether it applied**, so the handler only persists (and
    only bumps `updatedAt`) when something actually changed.
  - Gateway errors from Stripe are mapped to structured billing errors instead of
    leaking driver-level failures.

  Adds an `AddSubscriptionLastEventAt` migration for the new column.

- Updated dependencies [4943eff]
- Updated dependencies [e209380]
- Updated dependencies [aa0eefd]
- Updated dependencies [a93cf5d]
- Updated dependencies [55e1d1a]
- Updated dependencies [9c3e158]
- Updated dependencies [719859f]
  - @flama/shared@0.2.0
  - @flama/backend-email@0.2.0
  - @flama/backend-ddd@0.2.0
  - @flama/backend-core@0.2.0
  - @flama/backend-queue@0.1.1
