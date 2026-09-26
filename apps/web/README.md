# @flama/web

The consumer product's browser app: sign-up and sign-in, onboarding into a
first organization, the dashboard, the profile, and the workspace settings
(general, security, API tokens). Platform administration is a different app,
[`apps/admin-web`](../admin-web).

## Stack

- Vite SPA, built to static assets and served by nginx in Docker
- TanStack Router (file routes in `src/routes/`, tree generated into
  `src/routeTree.gen.ts`) and TanStack Query, persisted to `localStorage`
- Tailwind CSS v4 with `@flama/design-system-web`
- react-i18next over `@flama/translations`; only the default locale is bundled
- React Hook Form with `zodResolver` over schemas from `@flama/shared`
- Better Auth browser client (cookie session) via `@flama/auth`

## Run it

Configuration comes from the **root `.env`** — `envDir` in `vite.config.ts`
points at the repo root, and a `.env` in this directory is deliberately not
read. The dev server proxies `/api` to the API, so the session cookie stays
same-origin; set `VITE_API_URL` only when the API is on another origin.

```bash
pnpm docker:dev                     # Postgres + Redis
pnpm --filter @flama/api dev        # the API this app talks to
pnpm --filter @flama/web dev        # http://localhost:3000
pnpm --filter @flama/web build      # vite build (writes the route tree), then tsc -b
pnpm --filter @flama/web preview
pnpm --filter @flama/web test       # Vitest
pnpm --filter @flama/web lint
pnpm --filter @flama/web arch       # dependency-cruiser
pnpm --filter @flama/e2e e2e:web    # Playwright, against a live API
```

## Layout

```
src/
├── main.tsx, app.tsx     # bootstrap, router, the single <Toaster />
├── routes/               # Route + a mount, under 120 lines each
├── features/             # <module>/{screens,sections,dialogs,forms,components,hooks,lib,__tests__}
├── providers/            # flama-provider.tsx, query-provider.tsx
├── lib/                  # configuration only: flama.ts, auth-client.ts, nav.ts
├── styles/
└── types/
public/
├── theme-init.js         # applies the stored theme before first paint
└── session-preload.js    # starts the session lookup before the bundle parses
```

## Where the shared code lives

- UI and browser glue both Vite apps share — `AppShell`, `DataTable`,
  `useTableQuery`, `useZodResolver`, `dateFormatter` — are in
  `@flama/frontend-web` (`packages/frontend/web`).
- Primitives are in `@flama/design-system-web`.
- Domain logic is in `@flama/frontend-core` (session, users, user settings,
  capabilities, analytics) and `@flama/frontend-consumer` (api-tokens,
  organizations, profile). This app loads the consumer product and never the
  admin one.

## More

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the layers, the kind table, the
  route contract, the render rules, what the checkers enforce.
- [`AGENTS.md`](./AGENTS.md) — the short version for agents.
