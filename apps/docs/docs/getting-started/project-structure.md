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
