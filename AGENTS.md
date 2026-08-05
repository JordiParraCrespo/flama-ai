# Flama — Agent Instructions

## Project overview

Flama is a full-stack monorepo boilerplate built with Turborepo + pnpm. It contains 8 apps and 13 shared packages.

## Monorepo structure

```
flama/
├── apps/
│   ├── api/              # NestJS REST API
│   ├── cli/              # `flama` command-line interface
│   ├── docs/             # Docusaurus documentation
│   ├── mcp/              # MCP server (stdio + Streamable HTTP)
│   ├── mobile/           # Expo (React Native)
│   ├── mobile-showcase/  # Expo app showcasing the mobile design system
│   ├── web/              # Vite + TanStack Router SPA
│   └── web-showcase/     # Next.js app showcasing the web design system
├── packages/
│   ├── api-client/       # Auto-generated typed client from Swagger
│   ├── backend/
│   │   ├── cache/        # Redis cache abstraction (@flama/backend-cache)
│   │   ├── core/         # Errors, filters, pipes, interceptors (@flama/backend-core)
│   │   ├── ddd/          # DDD/hexagon building blocks (@flama/backend-ddd)
│   │   ├── email/        # Pluggable email + React Email templates (@flama/backend-email)
│   │   ├── queue/        # BullMQ + Bull Board (@flama/backend-queue)
│   │   └── storage/      # File storage Local/S3 (@flama/backend-storage)
│   ├── config/           # Shared TypeScript configs
│   ├── design-system/
│   │   ├── web/          # shadcn/ui + Base UI + Tailwind v4 (@flama/design-system-web)
│   │   └── mobile/       # NativeWind + rn-primitives (@flama/design-system-mobile)
│   ├── frontend/         # Clean architecture, InversifyJS DI, Zustand stores
│   ├── shared/           # Zod schemas, types, CASL permissions
│   └── translations/     # Shared i18n JSON files
├── docker/               # Docker Compose (dev + prod)
├── helm/                 # Kubernetes Helm charts
└── .github/              # GitHub Actions CI/CD
```

Each app and package has its own `README.md` covering its purpose, exports, and
usage.

## Key conventions

### General

- Node 22 LTS, pnpm workspaces, Turborepo for task orchestration
- Biome for linting and formatting (not ESLint/Prettier)
- Conventional commits enforced via commitlint
- Independent versioning per package via Changesets
- No git hooks — CI enforces quality

### Backend (`apps/api` + `packages/backend/*`)

`apps/api` follows **Domain-Driven Hexagon** architecture — see
[`apps/api/ARCHITECTURE.md`](apps/api/ARCHITECTURE.md) for the layer model, module
anatomy, the `@flama/backend-ddd` building blocks, and the "add a module"
cookbook. Use the `/scaffold-module` skill to generate a compliant module
skeleton. Boundaries are enforced by `apps/api/.dependency-cruiser.cjs`
(`pnpm arch`, run in CI and by a Claude Code Stop hook).

Detailed rules for the backend are in `.claude/rules/` (scoped to `apps/api`, `packages/backend`, and—for `rbac-roles.md`—`packages/shared`):

- `nestjs-di.md` — DI import rules, `import type` restrictions, repository-port DI tokens
- `nestjs-architecture.md` — DDD vertical slices, CQRS handlers, domain layer, ports/adapters, mappers, errors, events
- `typeorm.md` — Union-typed column rules, persistence-model (ORM) conventions
- `backend-packages.md` — CJS exports, package structure (pluggable vs library), email template setup
- `api-config.md` — OAuth graceful handling, controllers, Swagger decorators, rate limiting, versioning
- `rbac-roles.md` — database-backed roles & permissions, `@CheckPolicies`/`PoliciesGuard`, resource scoping, role-management endpoints
- `scopes-and-credentials.md` — the scope catalog, `@RequireScopes`/`ScopesGuard`, API tokens, OAuth for MCP clients

#### Authorization (roles & permissions)

Authorization is **database-backed dynamic RBAC** — roles and their permissions
live in the `role` table and are managed by admins through the API, not hardcoded.
A user can hold **multiple roles** (`user_role` join); their effective CASL
ability is the union of those roles' permissions. Protect routes with
`@UseGuards(AuthGuard, PoliciesGuard)` + `@CheckPolicies({ action, subject })`;
the guard resolves the ability via `AbilityFactory` and exposes it on
`request.ability` for resource-scoped checks. The `roles` module
(`apps/api/src/roles/`) exposes CRUD + `PUT /roles/:id/permissions` and
`GET|PUT /users/:userId/roles`. See `rbac-roles.md` for the full guide.

### CLI (`apps/cli`) and MCP server (`apps/mcp`)

Both are governed by the **scope catalog** in `packages/shared/src/scopes/`.
Roles say what a person may do; scopes say what a credential may do on their
behalf, and effective access is the intersection — see
`.claude/rules/scopes-and-credentials.md` and the "CLI & MCP" docs section.

- `apps/cli` — commander-based; commands in `src/commands/`, shared plumbing in
  `src/lib/` (config profiles, HTTP client, output, prompts). Exit codes are a
  public contract: 0 ok, 1 failure, 2 usage, 3 auth, 4 forbidden, 5 not found,
  6 unreachable.
- `apps/mcp` — one tool registry in `src/tools/`, two entrypoints in `src/bin/`.
  Every tool declares `requiredScopes`; the tool list is filtered by the
  credential's effective scopes.

### Shared (packages/shared)

- Zod schemas are the single source of truth for DTOs
- CASL helpers shared between backend and frontend: `defineAbilitiesFromPermissions`
  (DB-driven, the source of truth) and the legacy `defineAbilitiesFor` fallback
- Types: `Role` (a free-form role-name `string`), `PermissionDefinition`,
  `AuthProvider`, `JwtPayload`, `TokenPair`, `PaginationParams`, `PaginatedResponse<T>`
- Constants: `AUTH` (token expiry, salt rounds), `PAGINATION`, `ROLES`,
  `SYSTEM_ROLES`, `SYSTEM_ROLE_PERMISSIONS`, `QUEUE_NAMES`

### Frontend (packages/frontend)

- Clean architecture: domain → presentation → data-access
- InversifyJS for dependency injection
- Zustand vanilla stores (shared between web and mobile)
- TanStack Query for server state
- Platform-specific implementations injected via DI container

### Web (apps/web)

- Vite SPA built to static assets, served by nginx in Docker
- Tailwind CSS v4, shadcn/ui components
- react-i18next for i18n (translations from `packages/translations`)
- Vite env vars (`import.meta.env`, `VITE_`-prefixed) for configuration

### Mobile (apps/mobile)

- Expo with expo-router
- NativeWind + `@flama/design-system-mobile` components for UI
- i18next for i18n (translations from `packages/translations`)
- expo-secure-store for secure token storage

### Design system (packages/design-system)

Split into two independently versioned packages that share a mirrored component API:

- `@flama/design-system-web` (`packages/design-system/web`) — shadcn/ui-style
  components on Base UI primitives + Tailwind CSS v4. Tokens/base layer live in
  `src/styles/globals.css`; built with tsup. Used by `apps/web` and
  `apps/web-showcase`.
- `@flama/design-system-mobile` (`packages/design-system/mobile`) — shadcn-style
  React Native components on NativeWind + `@rn-primitives`. Used by `apps/mobile`
  and `apps/mobile-showcase`.
- The shadcn component API is mirrored across web and mobile for consistency.

## Dependency flow

```
packages/config           → used by all apps and packages (tsconfig extends)
packages/shared           → used by api, frontend, api-client
packages/backend/core     → used by api, other backend packages
packages/backend/ddd      → used by api (depends on backend/core)
packages/backend/email    → used by api
packages/backend/cache    → used by api
packages/backend/storage  → used by api
packages/backend/queue    → used by api
packages/translations        → used by web, mobile
packages/design-system/web    → used by web, web-showcase
packages/design-system/mobile → used by mobile, mobile-showcase
packages/api-client           → used by frontend
packages/frontend             → used by web, mobile
```

## Commands

```bash
pnpm dev                # Start all apps
pnpm build              # Build everything
pnpm test               # Unit tests
pnpm test:integration   # Integration tests (needs Docker)
pnpm check              # Biome lint + format
pnpm docker:dev         # Start Postgres + Redis
pnpm generate:api-client # Regenerate typed API client (no database needed)
pnpm changeset          # Create a changeset for versioning
```

## Deployment

- **Tier 1 (~€4/mo)**: Hetzner VPS + Docker Compose for API/DB/Redis, free hosting for web/docs
- **Tier 2 (~€15-35/mo)**: Hetzner K8s + Helm charts (`helm/flama/`)
- Docker images built in CI (GitHub Actions), pushed to GHCR
- Mobile: EAS Build (Expo)

## When modifying code

- Shared types/schemas go in `packages/shared`, not duplicated in apps
- New API endpoints need Swagger decorators for auto-generated client
- After API changes, regenerate client: `pnpm generate:api-client`
- New translations go in `packages/translations/{locale}/index.json`
- New web design tokens go in `packages/design-system/web/src/styles/globals.css`
- Frontend business logic goes in `packages/frontend`, not in app components
- Keep pluggable service pattern: abstract class → concrete implementations → factory in module
- New API endpoints need `@RequireScopes` or they are unreachable by API tokens and MCP clients
- New MCP tools go in `apps/mcp/src/tools/`, declaring the same scope the endpoint requires
- `apps/web` must not import runtime values from the `@flama/shared` **root**: its CJS build is not tree-shakeable by Rollup, so the whole graph (CASL, the scope catalog) lands in the bundle. Import a narrow subpath instead — `@flama/shared/schemas/auth` pulls in nothing but Zod — or fetch the data from the API, as the permission catalog does. Workspace `dist` folders sit outside `node_modules`, so anything newly imported this way needs adding to `optimizeDeps.include` in `apps/web/vite.config.ts` for dev
- Forms in `apps/web` and `apps/mobile` use **React Hook Form** with `zodResolver` over the `@flama/shared` schemas; wire the resolver through each app's `useZodResolver` so validation messages stay translated
