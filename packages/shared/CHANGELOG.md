# @flama/shared

## 0.3.0

### Minor Changes

- 755b293: Add the authorization kernel: a feature module declares one resource object and
  gets tenant isolation, team scoping, row-level SQL filtering, a role-builder
  entry and a credential scope without writing an authorization check.

  Also closes two defects in the existing system: `PoliciesGuard` allowed any
  authenticated caller through a route that declared no policy, and roles were
  global (`role.name` was unique table-wide), so two tenants could not both define
  a `manager` role.

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
  - `@flama/frontend` adds a `capabilities` module and a
    `useDeploymentCapabilities()` hook; the web login page uses it to render
    only configured social providers, and to name the env vars to set when none
    are (only after a successful read — an unreachable API or a failed refetch
    with retained stale data is not a missing configuration).

- 6bf67a5: Adopt React Hook Form across `apps/web` and `apps/mobile`.

  Every auth form on both platforms now runs through `useForm`, validated against
  the Zod schemas in `@flama/shared` via `@hookform/resolvers`. Web forms were
  uncontrolled `FormData` reads leaning on native browser validation, and mobile
  screens held one `useState` per field and reported the first Zod failure in an
  `Alert`. Both now surface per-field errors inline, next to the input that caused
  them, and no longer submit until the whole form parses.

  `@flama/frontend` gains a `/validation` entrypoint exporting `createZodErrorMap`.
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
  read problem documents (still understanding the old body shape), `@flama/frontend`
  exposes `toAppError` and the `@MapApiError` method decorator so screens can show
  the server's `detail` and per-field errors, and `ApiProblemResponse` puts the
  schema in the OpenAPI document and the generated client.

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
