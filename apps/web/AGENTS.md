# @flama/web — Agent Instructions

Vite SPA (React) built to static assets, served by nginx in Docker.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first for repo-wide conventions.

## Stack

- **Vite** SPA + **TanStack Router** (file-based routes in `src/routes/`,
  generated tree in `src/routeTree.gen.ts` — do not edit by hand)
- **TanStack Query** for server state, persisted to `localStorage` (policy from
  `@flama/frontend/react`, wired in `src/providers/query-provider.tsx`)
- **Tailwind CSS v4** + **shadcn/ui** (from `@flama/design-system-web`)
- **react-i18next** for i18n (translations from `@flama/translations`)
- Config via Vite env vars (`import.meta.env`, `VITE_`-prefixed), loaded from
  the root `.env` (`envDir` points at the repo root — a `.env` in this app
  directory is deliberately not read)

## Layout

```
src/
├── main.tsx          # app bootstrap
├── app.tsx
├── routes/           # TanStack Router file-based routes
├── components/       # app-local UI
├── providers/        # React context providers (query, i18n, DI)
├── lib/              # helpers
├── styles/
└── types/
```

## Where code goes

- **Business logic lives in `@flama/frontend`**, not in app components. The
  frontend package (clean architecture + InversifyJS DI + Zustand) is shared
  with mobile; inject platform-specific implementations via its DI container.
- Reusable UI primitives come from `@flama/design-system-web`.
- Server calls go through `@flama/api-client` (generated) wrapped in
  `@flama/frontend` data-access.

## Commands

```bash
pnpm --filter @flama/web dev
pnpm --filter @flama/web build
pnpm --filter @flama/web preview
pnpm --filter @flama/web lint
```
