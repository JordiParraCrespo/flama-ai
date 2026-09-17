# @flama/admin-web

The browser control plane. It manages platform users — creating them, banning
and unbanning, setting passwords, revoking sessions, assigning application
roles — and the roles themselves with their permission grants. Consumer
features belong in [`apps/web`](../web); this app has no registration route and
no workspace of its own.

Access is gated twice: the API restricts control-plane endpoints, and
`src/routes/_authenticated.tsx` renders an access-denied alert unless the
signed-in profile reports `canAccessControlPlane`.

## Stack

- Vite SPA, built to static assets and served by nginx in Docker
- TanStack Router (file routes in `src/routes/`, tree generated into
  `src/routeTree.gen.ts`) and TanStack Query, persisted to `localStorage`
- Tailwind CSS v4 with `@flama/design-system-web`
- react-i18next over `@flama/translations`
- React Hook Form with `zodResolver` over schemas from `@flama/shared`
- Better Auth browser client (cookie session) via `@flama/auth`

## Run it

Configuration comes from the **root `.env`** — `envDir` in `vite.config.ts`
points at the repo root, and a `.env` in this directory is deliberately not
read. Set `ADMIN_FRONTEND_URL` to the public origin in deployed environments.

```bash
pnpm docker:dev                          # Postgres + Redis
pnpm --filter @flama/api dev             # the API this app talks to
pnpm --filter @flama/admin-web dev       # http://localhost:3003
pnpm --filter @flama/admin-web build     # tsc -b && vite build
pnpm --filter @flama/admin-web preview
pnpm --filter @flama/admin-web test      # Vitest
pnpm --filter @flama/admin-web lint
pnpm --filter @flama/admin-web arch      # dependency-cruiser
```

## Layout

```
src/
├── main.tsx, app.tsx     # bootstrap, router, the single <Toaster />
├── routes/               # Route + a mount, under 120 lines each
├── features/             # admin-users/, roles/, auth/ — kind directories only
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
  `useTableQuery`, `useZodResolver`, `sanitizeRedirect` — are in
  `@flama/frontend-web` (`packages/frontend/web`), the same kit `apps/web` uses.
- Primitives are in `@flama/design-system-web`.
- Domain logic is in `@flama/frontend-core` (session, users, user settings,
  capabilities, analytics) and `@flama/frontend-admin` (admin-users, roles).
  This app loads the admin product and never the consumer one.

## More

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the layers, the kind table, the
  route contract, the render rules, what the checkers enforce.
- [`AGENTS.md`](./AGENTS.md) — the short version for agents.
