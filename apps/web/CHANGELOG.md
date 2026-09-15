# @flama/web

## 0.3.0

### Minor Changes

- 48d1b41: Make the web delivery path carry its weight: compression, caching, a real CSP,
  and a budget that keeps first load honest.

  The built SPAs were served by a 14-line nginx config that set none of the three
  things nginx does not do by default. The official image ships `gzip` commented
  out, so the ~1.1MB entry chunk went over the wire uncompressed; hashed assets
  got no `Cache-Control`, so every repeat visit revalidated all ~50 chunks; and
  the Content-Security-Policy that `index.html` and `public/theme-init.js` were
  already written against — both keep the theme bootstrap in a separate file
  specifically to avoid an inline-script exception — did not exist. All three are
  now set, with the policy's third-party origins in one substituted
  `CSP_EXTRA_ORIGINS` variable (defaulted in the Dockerfile, overridable per
  deployment through `helm/flama/values.yaml`). Measured on the current build:
  1,130KB → 324KB for the entry chunk, 152KB → 24KB for the stylesheet.

  On the critical path itself:

  - **Only the default locale is bundled.** `@flama/translations` grew two
    narrower entrypoints — `/locales` for metadata and `/lazy` for one catalog per
    chunk — because importing `locales` or `Messages` from the root barrel put
    every catalog in the entry chunk. The Spanish catalog was measurably inside
    what an English reader downloaded before anything rendered.
  - **The session lookup starts before the bundle parses.** Nothing renders until
    `useSessionRestore` resolves, and that request used to begin only after the
    bundle had downloaded, parsed and mounted React. `public/session-preload.js`
    issues it from `<head>`; `consumeSessionPreload` in `@flama/auth` takes the
    answer once, and falls back to the auth client for anything unusable, so the
    worst case is a wasted request rather than a reader treated as signed out.
  - **Route chunks are prefetched on intent.** `defaultPreload: 'intent'` means
    hovering a link fetches the route it points at, instead of every navigation
    starting a request.
  - **Dependencies are chunked per library** via a shared
    `@flama/config/vite-chunks.mjs`, so a release invalidates app code (42KB) and
    leaves the vendor chunks cached (263KB). Splitting costs ~48KB gzipped on a
    cold first load, which is the trade the `immutable` caching above pays for —
    the number is recorded in that file.
  - `sideEffects` declared on `@flama/design-system-web` (CSS excepted),
    `@flama/translations` and `@flama/api-client`, worth ~7KB gzipped.

  And so it stays fixed: `pnpm check:bundle` gzips everything the built
  `index.html` references and fails past a committed budget, in CI after
  `pnpm build`. Vite's own 500KB warning prints and passes, which is how a 1.1MB
  entry chunk went unnoticed. The Playwright `api` project runs in CI too — 69
  specs that existed and that no job ran, five of which had been failing since the
  console mailbox line gained a `Locale:` segment the e2e helper never learned
  about. The `web` project stays out until it is repaired: it drives a `/team`
  route `apps/web` no longer has, and 15 of its 64 specs fail on `main`. See
  `e2e/README.md`.

### Patch Changes

- 28b2d1b: Extract the Better Auth configuration both sides must agree on into a new `@flama/auth` package: the user-fields schema (consumed by the server's `user.additionalFields` and the clients' `inferAdditionalFields`), the shared client plugin set (`admin`, `organization` with the `teams` flag), and the `unwrap()` / `toAuthSession()` helpers previously copy-pasted into both client adapters. The `./client` entry ships TypeScript sources to preserve Better Auth's type inference; the root entry is compiled CJS for the NestJS API.
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
- Updated dependencies [7fdcefc]
- Updated dependencies [af46e89]
- Updated dependencies [28b2d1b]
- Updated dependencies [c27a7f4]
- Updated dependencies [510fb79]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
- Updated dependencies [d532ef4]
- Updated dependencies [e6895ae]
- Updated dependencies [48d1b41]
  - @flama/design-system-web@0.2.0
  - @flama/frontend@0.3.0
  - @flama/shared@1.0.0
  - @flama/api-client@1.0.0
  - @flama/translations@0.3.0
  - @flama/auth@0.2.0

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
- Updated dependencies [a93cf5d]
- Updated dependencies [55e1d1a]
- Updated dependencies [9c3e158]
- Updated dependencies [68348a6]
- Updated dependencies [719859f]
  - @flama/shared@0.2.0
  - @flama/frontend@0.2.0
  - @flama/api-client@0.2.0
  - @flama/translations@0.2.0
