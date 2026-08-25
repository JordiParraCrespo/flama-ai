# @flama/translations

## 0.3.0

### Minor Changes

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
  - **`@flama/frontend`** — new `createErrorMessageResolver` translating a failure
    from its problem `code`; the organizations repository no longer swallows a
    failed read into an empty list.
  - **`@flama/api-client`** — regenerated; the documented failures now reach the
    OpenAPI document.

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

### Patch Changes

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
