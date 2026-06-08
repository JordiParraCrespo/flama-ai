# Flama

Full-stack monorepo boilerplate for bootstrapping applications fast.

## What's included

| App/Package              | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `apps/api`               | NestJS REST API — auth, queues, caching, storage, email |
| `apps/web`               | Next.js — Tailwind v4, shadcn/ui, next-intl             |
| `apps/mobile`            | Expo — Tamagui, i18next, SecureStore                    |
| `apps/docs`              | Docusaurus — project documentation                      |
| `packages/shared`        | Zod schemas, types, CASL permissions, constants         |
| `packages/frontend`      | Clean architecture, InversifyJS DI, Zustand stores      |
| `packages/design-system` | Shared tokens, web + mobile components                  |
| `packages/api-client`    | Auto-generated typed client from Swagger                |
| `packages/translations`  | Shared i18n (en/es)                                     |
| `packages/config`        | Shared TypeScript configs                               |

## Quick start

```bash
# Install dependencies
pnpm install

# Start infrastructure (Postgres + Redis)
pnpm docker:dev

# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Start all apps in dev mode
pnpm dev
```

## Services

| App                | URL                            |
| ------------------ | ------------------------------ |
| Web                | http://localhost:3000          |
| API                | http://localhost:3001          |
| API Docs (Swagger) | http://localhost:3001/api/docs |
| Docs               | http://localhost:3002          |

## Tech stack

- **Monorepo**: Turborepo + pnpm
- **Backend**: NestJS, TypeORM, PostgreSQL, Redis, BullMQ
- **Web**: Next.js, Tailwind v4, shadcn/ui
- **Mobile**: Expo, Tamagui
- **Auth**: Better Auth (email/password + Google + GitHub), cookie sessions, Expo plugin for mobile
- **Authorization**: CASL
- **Validation**: Zod
- **State**: Zustand + TanStack Query
- **DI**: InversifyJS (frontend), NestJS (backend)
- **Testing**: Vitest, Testcontainers
- **CI/CD**: GitHub Actions
- **Deployment**: Docker, Helm (K8s)

## Deployment tiers

- **Tier 1 (~€4/mo)**: Hetzner VPS + Docker Compose, Vercel/Cloudflare free tier for web/docs
- **Tier 2 (~€15-35/mo)**: Hetzner K8s + Helm charts

## Scripts

```bash
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all apps and packages
pnpm test             # Run unit tests
pnpm test:integration # Run integration tests
pnpm lint             # Lint all code
pnpm check            # Biome check + fix
pnpm docker:dev       # Start dev infrastructure
pnpm docker:dev:down  # Stop dev infrastructure
pnpm docker:prod      # Start production stack
pnpm changeset        # Create a changeset
pnpm generate:api-client # Regenerate API client from Swagger
```

## License

MIT
