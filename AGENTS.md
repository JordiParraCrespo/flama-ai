# Flama — Agent Instructions

## Project overview

Flama is a full-stack monorepo boilerplate built with Turborepo + pnpm. The
tree below is what it ships; more apps and Stripe billing are available as
plugins (see [Plugins](#plugins)).

## Monorepo structure

```
flama/
├── apps/
│   ├── api/              # NestJS REST API
│   ├── mobile/           # Consumer Expo app
│   └── web/              # Consumer Vite + TanStack Router SPA
├── packages/
│   ├── auth/             # Shared Better Auth config + client helpers (@flama/auth)
│   ├── backend/
│   │   ├── authz/        # Authorization kernel: grants, policies (@flama/backend-authz)
│   │   ├── cache/        # Redis cache abstraction (@flama/backend-cache)
│   │   ├── core/         # Errors, filters, pipes, interceptors (@flama/backend-core)
│   │   ├── ddd/          # DDD/hexagon building blocks (@flama/backend-ddd)
│   │   ├── email/        # Pluggable email + React Email templates (@flama/backend-email)
│   │   ├── i18n/         # Server-side translation + Intl formatting (@flama/backend-i18n)
│   │   ├── queue/        # BullMQ + Bull Board (@flama/backend-queue)
│   │   └── storage/      # File storage Local/S3 (@flama/backend-storage)
│   ├── tsconfig/         # Shared TypeScript configs
│   ├── env/              # Root .env loader (@flama/env)
│   ├── frontend/         # The React tier: logic split by product, glue split by platform
│   │   ├── core/         # Kernel every app loads: session, users, settings, DI (@flama/frontend-core)
│   │   ├── consumer/     # The consumer product's domain: organizations, profile (@flama/frontend-consumer)
│   │   ├── api-client/   # Auto-generated typed client from Swagger (@flama/api-client)
│   │   ├── web/          # What both Vite apps share: shell, auth chrome, table, i18n… (@flama/frontend-web)
│   │   ├── mobile/       # What both Expo apps share: config, storage, analytics… (@flama/frontend-mobile)
│   │   ├── react-hooks/  # Generic React hooks below both design systems: useControlled, useNow… (@flama/react-hooks)
│   │   └── design-system/
│   │       ├── web/      # shadcn/ui + Base UI + Tailwind v4 (@flama/design-system-web)
│   │       └── mobile/   # NativeWind + rn-primitives (@flama/design-system-mobile)
│   ├── shared/           # Zod schemas, types, CASL permissions
│   └── translations/     # Shared i18n JSON files
├── docker/               # Docker Compose (dev + prod)
└── .github/              # GitHub Actions CI/CD
```

Each app and package has its own `README.md` covering its purpose, exports, and
usage, and an `AGENTS.md` with the rules an agent needs there. Every `CLAUDE.md`
in the repo is a symlink to the `AGENTS.md` beside it: edit the `AGENTS.md`,
never the link.

Every app above except `api` is optional, and so is multi-tenancy (the
`organizations` feature). `scripts/starter/features.json` lists them with the
paths and marked config blocks that go with each one, and
**`pnpm starter:init`** turns the starter into a project: it asks which features
to keep and which plugins to add (or takes `--keep`/`--add`/`--yes` from an agent),
then prunes, installs, refreshes the lockfile and checks the result. Asked to
start or trim a project, run it; there is no dialog to hold beyond those two
questions. It ends by listing the prose lines that still name what went —
code is held to the markers, prose is not, because rewording a sentence takes
judgment — and those lines are yours to reword, so the docs read as if the
project had always been this shape. When you add a file that mentions an
optional app (CI, compose, `.env.example`, a sidebar), wrap the lines in
`# flama:begin <id>` / `# flama:end <id>`; `pnpm starter:check` fails
otherwise. A block several apps share (`flama:begin web|mobile`) stays until
the last of them goes, so its lines must hold for each one alone; a line that
names one of them gets a block of its own, and the check says so.

Two pieces sit in `scripts/lib/` because both the pruner and the installer
need them and have to agree: `markers.mjs` is everything that reads or
rewrites a marker — the parser, the slot an anchor names and the block it
marks (`blockAbove`), and the edits (`dropBlocks`, which the installer also
runs over what it copies, `narrowMarker`, `widenMarker`) — and `json-text.mjs`
is format-preserving surgery on JSON, delete and insert in pairs, so an edit
does not reflow a file the project owns. Nothing else splits a marker spec.
`prune.mjs` keeps its own git and filesystem helpers.

Nothing about starting a project is one-shot. A prune keeps `scripts/starter`,
`features.json` and every marker, and that is not leftover scaffolding:
**removal is the pruner**, so it reads that manifest and finds a plugin's lines
by those fences.

### Plugins

Pruning is one direction; **`pnpm plugin:add <id>`** is the other. A plugin is
something the starter deliberately does not ship, packaged so a project can add
it back; `pnpm plugin:list` names what a plugins repo offers. Most are apps, some
are a module of the API, `helm` is the Kubernetes chart, and one,
`organizations`, the starter also ships: the plugin is how a project that
pruned it gets it back, and the plugins repo fails when it stops reproducing
the starter's copy.

```bash
pnpm plugin:list                  # what is on offer, and what is installed
pnpm plugin:add admin-web         # install it
pnpm plugin:remove admin-web      # take it back out
```

**`scripts/starter/features.json` is the catalog** — the one this repo has.
An install writes its entry straight in, marked `"plugin": true`, so
`pnpm starter:check` covers an installed plugin and
`pnpm starter:prune --without <id>` removes it. `pnpm plugin:list` is a view
over what a plugins repo offers, not a second catalog.

A plugin is that entry plus three ops that put it in place: its own block of
text at a `flama:plugins <slot>` anchor; this plugin joining a block several
features share — widening its fence, or, where every other owner was pruned
and the block with them, op 1 again with the body the plugin carries; and the
entry's own `json` edits run backwards. A prune empties a feature's fences and
keeps them, so a plugin bringing it back merges into its own place; only a
block a slot put in place goes whole. Copied files arrive trimmed by the
prune's own edit. Generated files — `apps/api/openapi.json` and the
API client — carry no markers and neither direction edits them: a feature
with endpoints declares `regenerate`, and the prune, the installer and
`starter:init` run it after their install. The shape of all of it is the header of
`scripts/plugins/plugin.mjs`, which is the only document. `plugin.mjs` is the
command, `ops.mjs` the three ops, `source.mjs` where plugins come from and the
one rule for whether a project can take one — which `pnpm starter:init` plans
with before it touches anything.

## Key conventions

### General

- Node 22 LTS, pnpm workspaces, Turborepo for task orchestration
- **One `.env`, at the repo root**; the root `.env.example` is its
  documentation (a note per variable, nothing unread in it). Never add a
  per-package `.env`. Node apps load it via `@flama/env` (real env vars always
  win); the web apps read it through Vite's `envDir`; the mobile apps load it in
  `app.config.ts`
- Biome for linting and formatting (not ESLint/Prettier). The one exception is
  the apps' design-system linter, `@shadcn/lint`, which only ships as an
  ESLint/oxlint plugin: `pnpm lint:design` runs it through oxlint with oxlint's
  own rules switched off, so it enforces design-system rules and nothing Biome
  already covers — see `.agents/rules/frontend-ui.md`
- Conventional commits enforced via commitlint
- Independent versioning per package via Changesets
- Run **`pnpm ci:local`** before pushing: it is pull request CI's Check job,
  run here over what the branch affects, and the `pre-push` git hook refuses
  a commit it has not passed. Require the `CI` check. How CI decides what runs,
  how an image is picked up and where a root-level file is declared, is
  `scripts/ci/README.md`

### Backend (`apps/api` + `packages/backend/*`)

`apps/api` follows **Domain-Driven Hexagon** architecture — see
[`apps/api/ARCHITECTURE.md`](apps/api/ARCHITECTURE.md) for the layer model, module
anatomy, the `@flama/backend-ddd` building blocks, and the "add a module"
cookbook. Use the `/scaffold-module` skill to generate a compliant module
skeleton. Boundaries are enforced by `apps/api/.dependency-cruiser.cjs`
(`pnpm arch`, run in CI and by a Claude Code Stop hook).

Detailed rules live in `.agents/rules/`, each scoped by a `paths` glob so it
loads only for the code it governs. Three are frontend:

- `frontend-architecture.md` — the placement grid (kernel, product package,
  platform kit, feature), the kind directories and what each may import, the
  render rules, and the checks that hold them
- `forms.md` — React Hook Form and Zod validation across `apps/web`,
  `apps/mobile` and the shared schemas
- `frontend-ui.md` — reaching for the design system before writing markup, the
  colour vocabulary, where helpers and route files live, placeholder data,
  translating exports, and e2e coverage

The rest are backend (scoped to `apps/api`, `packages/backend`, and—for `rbac-roles.md`—`packages/shared`):

- `nestjs-di.md` — DI import rules, `import type` restrictions, repository-port DI tokens
- `nestjs-architecture.md` — DDD vertical slices, CQRS handlers, domain layer, ports/adapters, mappers, errors, events
- `typeorm.md` — Union-typed column rules, persistence-model (ORM) conventions
- `database-design.md` — the standard a table is held to: keys, types,
  `timestamptz`, foreign keys and their indexes, access-pattern indexes,
  tenancy, lifecycle, scale and lock-safe migrations. `/design-database`
  walks the process
- `backend-packages.md` — CJS exports, package structure (pluggable vs library), email template setup
- `api-config.md` — OAuth graceful handling, controllers, Swagger decorators, rate limiting, versioning

Errors are **RFC 7807 problem documents** (`application/problem+json`) produced by
the global `AllExceptionsFilter`; the catalog message is the stable problem
`title` and per-request specifics go in `AppError`'s `detail`. A new code is
declared in its module's `domain/*.errors.ts`; with the `docs` plugin
installed it also needs a row in `apps/docs/docs/errors.md`. See
`nestjs-architecture.md`.

- `feature-flags.md` — the flag catalog, kinds and safe defaults,
  `useFeatureFlag` / `@RequireFlag`, what is not a flag
- `rbac-roles.md` — database-backed roles & permissions, `@CheckPolicies`/`PoliciesGuard`, resource scoping, role-management endpoints
- `scopes-and-credentials.md` — the scope catalog, `@RequireScopes`/`ScopesGuard`, scoped credentials

#### Authorization (roles & permissions)

Database-backed dynamic RBAC: roles and permissions live in the `role` table,
a user holds many, and routes are guarded with `@CheckPolicies`. The full
guide is `.agents/rules/rbac-roles.md`.

#### Feature flags

Declared in code, targeted in the database, evaluated on the server, read on
every client from one endpoint. `FEATURE_FLAGS` in
`packages/shared/src/feature-flags/catalog.ts` is the only place a flag
exists; `apps/api/src/feature-flags/` holds each deployment's targeting,
segments and audit trail, evaluates everything in memory and serves the
caller's values at `GET /v1/feature-flags`; clients read them with
`useFeatureFlag('key')` from `@flama/frontend-core/react`, and a route gates
the same capability with `@RequireFlag('key')`. Temporary flags carry an
expiry that `pnpm check:flags` enforces in CI. The guide is
`.agents/rules/feature-flags.md`.

### Scoped credentials

Governed by the **scope catalog** in `packages/shared/src/scopes/`. Roles say
what a person may do; scopes say what a credential acting for them may do, and
effective access is the intersection — see
`.agents/rules/scopes-and-credentials.md`, and the permission catalog in
`packages/shared/src/scopes/README.md`.

### Shared (packages/shared)

- Zod schemas are the single source of truth for DTOs
- CASL helpers shared between backend and frontend: `defineAbilitiesFromPermissions`
  (DB-driven, the source of truth) and the legacy `defineAbilitiesFor` fallback
- Types: `Role` (a free-form role-name `string`), `PermissionDefinition`,
  `PaginationParams`, `PaginatedResponse<T>`, `ProblemDetails`,
  `DeploymentCapabilities`, `ClientCapabilities`
- Constants: `PAGINATION`, `ROLES`, `SYSTEM_ROLES`, `ORGANIZATION_ROLES`,
  `QUEUE_NAMES`
- Permissions (`src/permissions/`): `SYSTEM_ROLE_PERMISSIONS` and the CASL
  helpers above

### Frontend (packages/frontend, the frontend apps)

The frontend is split twice, and the two splits answer different questions:

- **By product** for logic. `core` is the kernel every app loads (session,
  users, user settings, capabilities, analytics, the InversifyJS container,
  config, validation). `consumer` is the consumer product's domain (entities,
  repositories, services, TanStack Query hooks), and `admin` is the control
  plane's, arriving with that plugin; an app loads exactly one, through
  `FlamaApp.create({ modules })`. The products never import each other — where
  they meet, the meeting point is a kernel contract.
- **By platform** for UI and glue. `web` and `mobile` hold what both apps of
  a platform share below their routes, organised by concern (`shell`, `auth`,
  `table`, `layout`, `forms`, `theme`, `i18n`, `analytics`, `platform`, …),
  each concern with the same kind directories a feature has. A kit imports the
  kernel only; a component that needs a product hook is a feature.
- **In the app**: routes compose, features contain. `features/<module>/`
  is named after a module of `core` or of the app's product package and holds
  only `screens/ sections/ dialogs/ forms/ components/ hooks/ lib/ __tests__/`.
  Features never import each other; `forms/` and `components/` never fetch;
  a route file stays under 120 lines.

The placement rules, the render rules (state at the lowest reader, effects
only in `hooks/`, the React Compiler on, no manual memo) and what enforces
them are `.agents/rules/frontend-architecture.md`. The layer model and the
cookbooks are `packages/frontend/ARCHITECTURE.md` and each app's
`ARCHITECTURE.md`; `/scaffold-feature` produces the shape; `pnpm arch`,
`pnpm check:structure` and Biome hold it.

### Web (apps/web)

- Vite SPA built to static assets, served by nginx in Docker
- Tailwind CSS v4, shadcn/ui components
- react-i18next for i18n (translations from `packages/translations`)
- React Hook Form + `zodResolver` for forms
- Vite env vars (`import.meta.env`, `VITE_`-prefixed) for configuration, read
  from the root `.env` (`envDir` in `vite.config.ts` points at the repo root)

### Control plane (the `admin-web` and `admin-mobile` plugins)

Not in the starter — `pnpm plugin:add admin-web` brings it, and it carries
`packages/frontend/admin`, the product package both control planes share.

- Separate web and Expo entrypoints for platform administration
- Restricted to Better Auth `admin` and `superadmin` platform roles
- Owns user lifecycle, application-role assignment, and role permissions
- Has no public registration flow; consumer products remain in `apps/web` and
  `apps/mobile`

### Mobile (apps/mobile)

- Expo with expo-router
- NativeWind + `@flama/design-system-mobile` components for UI
- i18next for i18n (translations from `packages/translations`)
- React Hook Form + `zodResolver` for forms (`Controller` per field)
- expo-secure-store for secure token storage

#### Forms (both apps)

React Hook Form over a Zod schema from `@flama/shared`, resolver wired through
the app's `useZodResolver`. The convention is `.agents/rules/forms.md`.

### Design system (packages/frontend/design-system)

Two independently versioned packages with a mirrored component API:
`@flama/design-system-web` (Base UI + Tailwind v4, tokens in
`src/styles/globals.css`) for `apps/web`, and `@flama/design-system-mobile`
(NativeWind + `@rn-primitives`) for `apps/mobile`. Usage rules are
`.agents/rules/frontend-ui.md`.

## Dependency flow

```
packages/tsconfig         → used by all apps and packages (tsconfig extends)
packages/env              → used by api, mobile (root .env loader)
packages/shared           → used by api, frontend, api-client, backend/core (wire types)
packages/auth             → used by api, web, mobile (shared Better Auth config)
packages/backend/core     → used by api, other backend packages
packages/backend/ddd      → used by api, backend/core (depends on nothing in the workspace)
packages/backend/email    → used by api
packages/backend/i18n     → used by api (bundles from packages/translations)
packages/backend/cache    → used by api
packages/backend/storage  → used by api
packages/backend/queue    → used by api
packages/translations        → used by web, mobile, api (email copy via backend/i18n)
packages/frontend/react-hooks          → used by both design systems, frontend/web, web (React only)
packages/frontend/design-system/web    → used by web, frontend/web
packages/frontend/design-system/mobile → used by mobile, frontend/mobile
packages/frontend/api-client  → used by frontend/core, frontend/consumer
packages/frontend/core        → used by every frontend package and app
packages/frontend/consumer    → used by web, mobile
packages/frontend/web         → used by web
packages/frontend/mobile      → used by mobile
```

## Commands

```bash
pnpm dev                # Start all apps
pnpm build              # Build everything
pnpm test               # Unit tests
pnpm test:integration   # Integration tests (needs Docker)
pnpm check              # Biome lint + format
pnpm ci:local           # The CI suite, locally, over what this branch affects — run before pushing
pnpm arch               # Architecture boundaries (dependency-cruiser), API and frontend
pnpm check:structure    # Frontend layout contract: feature names, kinds, route cap, docs
pnpm check:flags        # Feature flags: none past expiry, none declared but unread
pnpm check:compiler     # React Compiler bailouts per app; fails on a file outside its baseline
pnpm docker:dev         # Start Postgres + Redis
pnpm generate:api-client # Regenerate typed API client (no database needed)
pnpm changeset          # Create a changeset for versioning
```

## Deployment

- Docker Compose (`docker/`) for the API, Postgres and Redis
- Docker images built in CI (GitHub Actions), pushed to GHCR
- Mobile: EAS Build (Expo)

## When modifying code

- Shared types/schemas go in `packages/shared`, not duplicated in apps
- New env vars go in the root `.env.example` with a note on what they do; never
  add a per-package `.env` (see `.agents/rules/api-config.md`)
- New API endpoints need Swagger decorators and `@RequireScopes`; without the
  scope they are unreachable by a scoped credential. Afterwards run
  `pnpm generate:api-client`
- Keep the pluggable service pattern: abstract class → concrete implementations → factory in module
- New translations go in `packages/translations/{locale}/{area}.json`, then
  run `pnpm --filter @flama/translations assemble` so `{locale}/index.json`
  (generated) matches
- Where frontend code goes — kernel, product package, platform kit, or a
  feature's kind directory — is `.agents/rules/frontend-architecture.md`;
  `/scaffold-feature` builds the shape and `pnpm check:structure` checks it
- UI in the web apps and the web design system:
  `.agents/rules/frontend-ui.md`
- Routes in `apps/web` — a new URL, a guard, a layout route, search params,
  or anything that regenerates `routeTree.gen.ts` — are the
  `/tanstack-routing` skill (`.agents/skills/tanstack-routing/`). A route
  file's name is its URL, so a rename is a URL change
- Porting a design export onto the design system is the
  `/design-export-port` skill (`.agents/skills/design-export-port/`): the
  export's values go onto the token vocabulary in `globals.css` and the
  component rules in `packages/frontend/design-system/AGENTS.md` and
  `.agents/rules/frontend-ui.md`; it does not replace them. Fonts are system
  stacks
- Forms and Zod schemas: `.agents/rules/forms.md`
- Sign-up creates an account, not a workspace: with organizations, an
  org-less account is sent to `/onboarding`, which creates the first
  organization or accepts a pending invitation. Only `/register` passes the
  social `sign-up` intent
- `apps/web` must not import runtime values from the `@flama/shared` **root**:
  its CJS build is not tree-shakeable, so the whole graph lands in the bundle.
  Import a narrow subpath (`@flama/shared/schemas/auth`) or fetch from the API.
  Anything newly imported this way needs adding to `optimizeDeps.include` in
  `apps/web/vite.config.ts` for dev
- The same applies to `@flama/translations`: `apps/web` (and `apps/admin-web`,
  with that plugin) import metadata from `@flama/translations/locales` and catalogs from
  `@flama/translations/lazy`; only the default locale is bundled
- The web apps' critical path is budgeted: `pnpm check:bundle` fails past the
  number in `scripts/check-bundle-size.mjs`. Raise a budget only deliberately,
  in its own diff
- Compression, cache headers and the Content-Security-Policy for the SPAs live
  in `apps/web/nginx.conf` (and `apps/admin-web/nginx.conf`, with that
  plugin). A new third-party
  origin goes in `CSP_EXTRA_ORIGINS`; anything the browser must run before
  React is a file in `public/`, the policy admits no inline script
