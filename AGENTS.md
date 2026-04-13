# Flama — Agent Instructions

## Project overview

Flama is a full-stack monorepo boilerplate built with Turborepo + pnpm. It contains 4 apps and 6 shared packages.

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

### Backend (apps/api)

- NestJS with decorator-based patterns
- TypeORM for database (PostgreSQL)
- Passport.js for auth (local + Google + GitHub OAuth strategies), JWT tokens
- CASL for authorization (permissions defined in `packages/shared`)
- Zod for validation (via nestjs-zod, schemas from `packages/shared`)
- Pluggable services pattern: email (Console/Nodemailer/Resend), storage (Local/S3), cache (Redis default)
- BullMQ for async job processing (Redis-backed)
- Pino for structured JSON logging
- Testcontainers for integration tests
- Health endpoints: `/api/health` (liveness), `/api/ready` (readiness)

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

### Shared (packages/shared)

- Zod schemas are the single source of truth for DTOs
- CASL permission definitions shared between backend and frontend
- Types and constants used across all apps

## Dependency flow

```
packages/config        → used by all apps and packages (tsconfig extends)
packages/shared        → used by api, frontend, api-client
packages/translations  → used by web, mobile
packages/design-system → used by web, mobile
packages/api-client    → used by frontend
packages/frontend      → used by web, mobile
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
