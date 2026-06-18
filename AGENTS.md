# Flama — Agent Instructions

## Project overview

Flama is a full-stack monorepo boilerplate built with Turborepo + pnpm. It contains 4 apps and 11 shared packages.

## Monorepo structure

```
flama/
├── apps/
│   ├── api/              # NestJS REST API
│   ├── docs/             # Docusaurus documentation
│   ├── mobile/           # Expo (React Native)
│   └── web/              # Next.js
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
│   ├── design-system/    # Tokens + web (shadcn) + mobile (Tamagui)
│   ├── frontend/         # Clean architecture, InversifyJS DI, Zustand stores
│   ├── shared/           # Zod schemas, types, CASL permissions
│   └── translations/     # Shared i18n JSON files
├── docker/               # Docker Compose (dev + prod)
├── helm/                 # Kubernetes Helm charts
└── .github/              # GitHub Actions CI/CD
```

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

- Next.js with `output: "standalone"` for Docker
- Tailwind CSS v4, shadcn/ui components
- next-intl for i18n (translations from `packages/translations`)
- @t3-oss/env-nextjs for env validation

### Mobile (apps/mobile)

- Expo with expo-router
- Tamagui for UI (theme from `packages/design-system`)
- i18next for i18n (translations from `packages/translations`)
- expo-secure-store for secure token storage

### Design system (packages/design-system)

- Shared tokens (colors, spacing, typography) in `src/tokens/`
- Web components: shadcn + Tailwind in `src/web/`
- Mobile components: Tamagui in `src/mobile/`
- shadcn component API mirrored in Tamagui for consistency

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
packages/translations     → used by web, mobile
packages/design-system    → used by web, mobile
packages/api-client       → used by frontend
packages/frontend         → used by web, mobile
```

## Commands

```bash
pnpm dev                # Start all apps
pnpm build              # Build everything
pnpm test               # Unit tests
pnpm test:integration   # Integration tests (needs Docker)
pnpm check              # Biome lint + format
pnpm docker:dev         # Start Postgres + Redis
pnpm generate:api-client # Regenerate typed API client
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
- New design tokens go in `packages/design-system/src/tokens/`
- Frontend business logic goes in `packages/frontend`, not in app components
- Keep pluggable service pattern: abstract class → concrete implementations → factory in module
