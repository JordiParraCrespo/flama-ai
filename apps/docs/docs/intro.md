---
slug: /
sidebar_position: 1
---

# Flama

Full-stack monorepo boilerplate for bootstrapping applications fast.

## What's included

- **apps/api** — NestJS REST API with auth, queues, caching, and more
- **apps/web** — Next.js with Tailwind v4 and shadcn/ui
- **apps/mobile** — Expo (React Native) with Tamagui
- **apps/docs** — This documentation site (Docusaurus)
- **packages/shared** — Zod schemas, types, CASL permissions
- **packages/frontend** — Clean architecture with InversifyJS DI
- **packages/design-system** — Shared tokens, web and mobile components
- **packages/api-client** — Auto-generated typed API client
- **packages/translations** — Shared i18n files
- **packages/config** — Shared TypeScript and tooling configs

### Backend packages

Reusable NestJS modules under `packages/backend/`, each following a pluggable service pattern:

- **@flama/backend-core** — Errors, filters, interceptors, pipes, mapper interface
- **@flama/backend-email** — Pluggable email (Console / Nodemailer / Resend) with React Email templates
- **@flama/backend-cache** — Redis cache abstraction
- **@flama/backend-storage** — File storage (Local / S3)
- **@flama/backend-queue** — BullMQ async jobs + Bull Board admin UI
