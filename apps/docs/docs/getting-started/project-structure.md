---
sidebar_position: 2
---

# Project Structure

```
flama/
├── apps/
│   ├── api/              # NestJS REST API
│   ├── docs/             # Docusaurus documentation
│   ├── mobile/           # Expo (React Native)
│   └── web/              # Next.js
├── packages/
│   ├── api-client/       # Auto-generated typed API client
│   ├── backend/
│   │   ├── cache/        # Redis cache abstraction (@flama/backend-cache)
│   │   ├── core/         # Errors, filters, pipes, interceptors (@flama/backend-core)
│   │   ├── email/        # Pluggable email + React Email templates (@flama/backend-email)
│   │   ├── queue/        # BullMQ + Bull Board (@flama/backend-queue)
│   │   └── storage/      # File storage Local/S3 (@flama/backend-storage)
│   ├── config/           # Shared TS and tooling configs
│   ├── design-system/    # Tokens + web + mobile components
│   ├── frontend/         # Clean architecture, DI, stores
│   ├── shared/           # Zod schemas, types, permissions
│   └── translations/     # Shared i18n JSON files
├── docker/               # Docker Compose files
├── helm/                 # Kubernetes Helm charts
├── .github/              # GitHub Actions workflows
├── turbo.json            # Turborepo config
└── pnpm-workspace.yaml   # pnpm workspace config
```

## Dependency flow

```
packages/config           → all apps and packages (tsconfig extends)
packages/shared           → api, frontend, api-client
packages/backend/core     → api, other backend packages
packages/backend/email    → api
packages/backend/cache    → api
packages/backend/storage  → api
packages/backend/queue    → api
packages/translations     → web, mobile
packages/design-system    → web, mobile
packages/api-client       → frontend
packages/frontend         → web, mobile
```
