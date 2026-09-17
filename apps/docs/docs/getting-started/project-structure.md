---
sidebar_position: 2
---

# Project Structure

```
flama/
├── apps/
│   ├── api/              # NestJS REST API
│   ├── admin-mobile/     # Expo control plane
│   ├── admin-web/        # Vite control plane
│   ├── docs/             # Docusaurus documentation
│   ├── mobile/           # Consumer Expo app
│   └── web/              # Consumer Vite SPA
├── packages/
│   ├── backend/
│   │   ├── cache/        # Redis cache abstraction (@flama/backend-cache)
│   │   ├── core/         # Errors, filters, pipes, interceptors (@flama/backend-core)
│   │   ├── email/        # Pluggable email + React Email templates (@flama/backend-email)
│   │   ├── queue/        # BullMQ + Bull Board (@flama/backend-queue)
│   │   └── storage/      # File storage Local/S3 (@flama/backend-storage)
│   ├── config/           # Shared TS and tooling configs
│   ├── design-system/    # Tokens + web + mobile components
│   ├── frontend/
│   │   ├── core/         # Kernel every app loads: session, users, settings, DI (@flama/frontend-core)
│   │   ├── consumer/     # Consumer domain: organizations, profile, api-tokens (@flama/frontend-consumer)
│   │   ├── admin/        # Control-plane domain: admin-users, roles (@flama/frontend-admin)
│   │   ├── api-client/   # Auto-generated typed client from Swagger (@flama/api-client)
│   │   ├── web/          # What both Vite apps share (@flama/frontend-web)
│   │   └── mobile/       # What both Expo apps share (@flama/frontend-mobile)
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
packages/translations     → consumer and control-plane apps
packages/design-system/web    → web, admin-web, web-showcase, frontend/web
packages/design-system/mobile → mobile, admin-mobile, mobile-showcase, frontend/mobile
packages/frontend/api-client  → frontend/core, frontend/consumer, frontend/admin
packages/frontend/core        → every frontend package and app
packages/frontend/consumer    → web, mobile
packages/frontend/admin       → admin-web, admin-mobile
packages/frontend/web         → web, admin-web
packages/frontend/mobile      → mobile, admin-mobile
```
