# @flama/mcp

## 0.3.0

### Minor Changes

- 4c51099: Adopt MCP protocol revision `2026-07-28`

  The MCP server now speaks the `2026-07-28` revision, the largest change to the
  protocol since it launched. Clients that still open with the 2025 `initialize`
  handshake keep working — both entrypoints serve them from the same tool
  registry — so this is not a breaking change for anyone connected today.

  What changed:

  - **Stateless by protocol, not just by convention.** The `initialize`
    handshake and the `Mcp-Session-Id` header are gone; every request carries its
    own protocol version, client identity and credential in `_meta`. The HTTP
    entrypoint builds a server per request from that credential, so replicas
    share nothing and a plain round-robin load balancer is enough.
  - **`server/discover`** is answered, advertising the supported revisions and
    capabilities up front.
  - **Cacheable tool lists.** `tools/list` is returned with `ttlMs` (default 60s,
    set `FLAMA_TOOLS_CACHE_TTL_MS`) and `cacheScope: "private"` — private because
    the list is derived from the caller's own permissions and must never be
    served to another user from a shared cache.
  - **Deterministic tool order.** Tools are advertised sorted by name, so a
    client's cache and the model's prompt cache are not busted by reshuffling.
  - **Honest capabilities.** `tools.listChanged` is advertised as `false`; this
    server has no change events to publish for a fixed-per-credential list.
  - **Wider `structuredContent`.** A non-object tool result is now passed through
    as-is, and only wrapped as `{ result: … }` when answering a 2025-era client.

  Under the hood this moves from `@modelcontextprotocol/sdk` v1 to the v2
  packages (`@modelcontextprotocol/server`, `@modelcontextprotocol/node`), which
  brings two local consequences: `apps/mcp` is now on Zod 4 (the rest of the
  monorepo stays on Zod 3 — this package imports no Zod schemas from
  `@flama/shared`), and tool `inputSchema` is now a Zod object schema rather than
  a raw shape:

  ```diff
  - inputSchema: { id: z.string().uuid() },
  + inputSchema: z.object({ id: z.string().uuid() }),
  ```

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

### Patch Changes

- Updated dependencies [755b293]
- Updated dependencies [7fdcefc]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
- Updated dependencies [25ff19f]
  - @flama/shared@0.3.0
  - @flama/env@0.2.0

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

- Updated dependencies [4943eff]
- Updated dependencies [e209380]
- Updated dependencies [55e1d1a]
- Updated dependencies [9c3e158]
- Updated dependencies [719859f]
  - @flama/shared@0.2.0
