# Flama

Full-stack monorepo boilerplate for bootstrapping applications fast. Every app
below is optional except the API — keep what you're building, prune the rest
(see [Starting your own project](#starting-your-own-project)).

## What's included

### Apps

| App                    | Description                                                              |
| ----------------------- | -------------------------------------------------------------------------- |
| `apps/api`              | NestJS REST API — Domain-Driven Hexagon architecture, DB-backed RBAC, queues, caching, storage, email |
| `apps/web`               | Consumer Vite + TanStack Router SPA                                       |
| `apps/mobile`            | Consumer Expo app — NativeWind, i18next, SecureStore                     |

### Plugins

Not everything ships in the box. These are packaged in
[`flama-ai-plugins`](https://github.com/JordiParraCrespo/flama-ai-plugins) and
added when a project wants them, with `pnpm plugin:add <id>`.
`pnpm plugin:list` shows what is on offer and marks what is already installed, and
`pnpm plugin:remove <id>` takes one back out — see
[Starting your own project](#starting-your-own-project).

### Packages

| Package                          | Description                                                        |
| --------------------------------- | -------------------------------------------------------------------- |
| `packages/shared`                 | Zod schemas, types, CASL permissions, scope catalog                |
| `packages/auth`                   | Shared Better Auth config — user fields, plugins, client helpers   |
| `packages/env`                    | Root `.env` loader shared by the Node apps                         |
| `packages/frontend/core`          | Kernel every app loads: session, users, user settings, capabilities, analytics, InversifyJS DI |
| `packages/frontend/consumer`      | Consumer product domain: organizations, profile                    |
| `packages/frontend/web`           | What both Vite apps share below their routes, by concern           |
| `packages/frontend/mobile`        | What both Expo apps share below their routes                       |
| `packages/backend/*`              | Cross-cutting NestJS toolkit: errors/filters (`core`), DDD building blocks (`ddd`), authorization kernel (`authz`), Redis cache (`cache`), queues (`queue`), file storage (`storage`), email (`email`), i18n (`i18n`) |
| `packages/frontend/design-system/web`      | shadcn/ui + Base UI + Tailwind v4 components                       |
| `packages/frontend/design-system/mobile`   | NativeWind + rn-primitives React Native components                 |
| `packages/frontend/api-client`    | Auto-generated typed client from Swagger                           |
| `packages/translations`           | Shared i18n (en/es)                                                |
| `packages/tsconfig`               | Shared TypeScript configs                                          |

### Testing

| Workspace | Description                                                                |
| --------- | ---------------------------------------------------------------------------- |
| `e2e`     | Playwright suites against the running API and web app                       |

`pnpm plugin:add qa` adds `qa/`, the scenario-driven pack with maturity
tracking and screenshots, and `pnpm plugin:add helm` the Kubernetes chart.

## Quick start

```bash
# Install dependencies
pnpm install

# Start infrastructure (Postgres + Redis)
pnpm docker:dev

# Copy the environment file (one .env at the repo root serves every app)
cp .env.example .env

# Start all apps in dev mode
pnpm dev
```

## Starting your own project

The starter ships every app it knows how to build; a real project keeps a few.
On a fresh clone:

```bash
pnpm starter:init
```

It asks which apps to keep (the API always stays) and which plugins to add,
shows the plan, and carries it out: removes what goes, installs what comes in
the order they need each other, refreshes the lockfile and checks the result.
Last, it lists the lines of prose that still mention what was removed, file by
file, for you (or your agent) to reword.

It is all or nothing: the work happens in a throwaway git worktree and reaches
your checkout as one patch, only once every step has passed there, so a plugin
that fails to install leaves the project as it was. (That is why it wants
committed work: the worktree is your last commit.)

Unattended, or from an agent — no `--add` means the same default the questions
offer (`docs`), and `--add ''` means none:

```bash
pnpm starter:init --keep web,e2e,organizations --yes
```

The same two directions stay available afterwards, one feature at a time:

```bash
pnpm starter:prune --without mobile         # take out something the starter shipped
pnpm plugin:list                            # what is on offer, and what you already have
pnpm plugin:add admin-web                   # the control plane, back in your project
pnpm plugin:remove admin-web
```

Both run on one mechanism. Every optional app is a feature in
`scripts/starter/features.json`, every file that mentions one wraps those
lines in `flama:begin`/`flama:end` markers, and an installed plugin becomes a
feature too — so `pnpm starter:check` (run in CI) fails when a reference
escapes them either way, and removing a plugin *is* the pruner rather than a
second implementation of it.

## Services

| App                | URL                            |
| ------------------ | ------------------------------ |
| Web                | http://localhost:3000          |
| API                | http://localhost:3001          |
| API Docs (Swagger) | http://localhost:3001/api/docs |

`pnpm plugin:add admin-web` serves the control plane on `:3003`, and
`pnpm plugin:add docs` the Docusaurus site on `:3002`.

## Tech stack

- **Monorepo**: Turborepo + pnpm
- **Backend**: NestJS (Domain-Driven Hexagon architecture), TypeORM, PostgreSQL, Redis, BullMQ
- **Web**: Vite + TanStack Router, Tailwind v4, shadcn/ui
- **Mobile**: Expo, NativeWind + rn-primitives
- **Auth**: Better Auth (email/password + Google + GitHub), cookie sessions, Expo plugin for mobile
- **Authorization**: Database-backed RBAC — roles and permissions managed through the API, enforced with CASL
- **Scoped credentials**: one shared scope catalog — a credential's effective access is the intersection of its scopes and the user's roles
- **Validation**: Zod
- **State**: Zustand + TanStack Query
- **DI**: InversifyJS (frontend), NestJS (backend)
- **Testing**: Vitest, Testcontainers, Playwright (`e2e`; the `qa` pack is a plugin)
- **Linting/formatting**: Biome, plus a design-system usage linter (oxlint) for `apps/web` and `apps/mobile`
- **CI/CD**: GitHub Actions (`.github/workflows/ci.yml`) over the packages a change affects; `pnpm ci:local` runs the same checks before a push
- **Deployment**: Docker Compose

## Scripts

```bash
pnpm dev                 # Start all apps in dev mode
pnpm build                # Build all apps and packages
pnpm test                 # Run unit tests
pnpm test:integration     # Run integration tests
pnpm test:e2e             # Run the Playwright e2e suite
pnpm lint                 # Lint all code
pnpm arch                 # Check architecture boundaries (apps/api and the frontend, via dependency-cruiser)
pnpm check                # Biome check + fix
pnpm ci:local             # Pull request CI's checks, locally, over what this branch affects
pnpm docker:dev           # Start dev infrastructure
pnpm docker:dev:down      # Stop dev infrastructure
pnpm docker:prod          # Start production stack (requires the root .env and BETTER_AUTH_SECRET)
pnpm docker:prod:down     # Stop production stack, keeping its volumes
pnpm changeset            # Create a changeset
pnpm generate:api-client  # Regenerate API client from Swagger
```

## License

MIT
