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
- **React Hook Form** + `zodResolver` for forms
- Config via Vite env vars (`import.meta.env`, `VITE_`-prefixed)

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

## Forms

React Hook Form, validated by a Zod schema from `@flama/shared`. Full
convention in [`.claude/rules/forms.md`](../../.agents/rules/forms.md); the
short version:

- `useForm({ resolver: useZodResolver(schema) })` — always via
  `src/lib/use-zod-resolver.ts`, never `zodResolver` directly, or the messages
  come out untranslated.
- `register()` for plain inputs, `Controller` for `Select`, checkbox groups and
  other ref-less controls.
- Errors render through the design system's `Field` / `FieldError`, which
  already accept React Hook Form's error shape. Set `data-invalid` on the
  `Field` and `aria-invalid` on the control, and put `noValidate` on the
  `<form>` so the native layer does not compete.
- Import auth schemas from `@flama/shared/schemas/auth`, not the package root —
  see the bundle note in the repo-root `AGENTS.md`.

## Commands

```bash
pnpm --filter @flama/web dev
pnpm --filter @flama/web build
pnpm --filter @flama/web preview
pnpm --filter @flama/web lint
```
