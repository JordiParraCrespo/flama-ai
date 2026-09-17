# @flama/admin-web — Agent Instructions

Super-admin Vite SPA for platform users and application roles. Keep consumer
features in `apps/web`; this app is the platform control plane.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first for repo-wide conventions.

## Stack

- **Vite** SPA + **TanStack Router** (file-based routes in `src/routes/`,
  generated tree in `src/routeTree.gen.ts` — do not edit by hand)
- **TanStack Query** for server state, persisted to `localStorage` (policy from
  `@flama/frontend/react`, wired in `src/providers/query-provider.tsx`)
- **Tailwind CSS v4** + **shadcn/ui** (from `@flama/design-system-web`)
- **react-i18next** for i18n (translations from `@flama/translations`)
- **React Hook Form** + `zodResolver` for forms
- Config via Vite env vars (`import.meta.env`, `VITE_`-prefixed), loaded from
  the root `.env` (`envDir` points at the repo root — a `.env` in this app
  directory is deliberately not read)

## Layout

```
src/
├── main.tsx          # app bootstrap
├── app.tsx
├── routes/           # TanStack Router file-based routes (Route + a tiny mount, ≤120 lines)
├── features/         # <module>/{screens,sections,dialogs,forms,components,hooks,lib}
├── providers/        # React context providers (query, i18n, DI)
├── lib/              # helpers
├── styles/
└── types/
```

## Where code goes

- **Business logic lives in `@flama/frontend`**, not in app components. The
  frontend package (clean architecture + InversifyJS DI + Zustand) is shared
  with mobile; inject platform-specific implementations via its DI container.
- **UI primitives come from `@flama/design-system-web`.** Before styling a
  `div`, read `packages/design-system/web/src/index.ts` and check whether the
  component already exists — do not go from memory. The full table of what to
  reach for is in [`.agents/rules/frontend-ui.md`](../../.agents/rules/frontend-ui.md).
- **A picker over a workspace list is a `Combobox`.** A field choosing one
  teammate or resource takes the autocomplete — with `onQueryChange`
  wired to the query that fetches its options, so typing asks the API rather
  than filtering the page already in hand. `Select` stays for fixed product
  lists (a stage, a source). The full table of which control picks what is in
  [`.agents/rules/frontend-ui.md`](../../.agents/rules/frontend-ui.md).
- **A route file only mounts.** `src/routes/` holds the `Route`
  (`beforeLoad`, `validateSearch`, `staticData`) and a tiny component that
  renders a screen; everything else lives in `src/features/<module>/<kind>/`.
  `<module>` is one of `admin-users`, `roles`, `auth`, `users`, `capabilities`,
  `analytics`. `screens/` is the page body a route mounts, `sections/` a pane
  or table, `dialogs/` one dialog per file owning its mutation, `forms/` a
  React Hook Form over a shared Zod schema (props in, `onSubmit` out — never
  imports the query port or the router), `components/` props-only entity UI,
  `hooks/` the only home for `useEffect`, `lib/` types and constants without
  JSX. No barrels, no sub-directories, and a feature never imports another
  feature; layout vocabulary shared by more than one feature comes from
  `@flama/frontend-web`.
- **The second time you write a helper, it moves to `src/lib/`.** Look there
  first — `download-csv`, `format-date`, `use-locale`, `use-copy`,
  `use-error-message`, `use-zod-resolver` are all there because they were
  written two or three times before.
- Server calls go through `@flama/api-client` (generated) wrapped in
  `@flama/frontend` data-access.

## Dates, numbers and locale

Format through `src/lib/format-date.ts`, taking the locale from `useLocale()`.
Never `toLocaleDateString()` with no argument — that ignores the user's
language setting entirely — and never a bare `i18n.language` or
`i18n.resolvedLanguage`: the first is wrong after a fallback, the second is
`string | undefined`. Constructing an `Intl` formatter inside render is the
expensive way to do it; `dateFormatter()` caches them.

## Data the product does not have yet

Render nothing. No badge is honest where a wrong one is not — the sidebar
shipped a hardcoded count to every user for months because a placeholder
outlived the comment promising to remove it. A component names the total it wants and
the shell resolves it from a query; unresolved stays `undefined`.

## Forms

React Hook Form, validated by a Zod schema from `@flama/shared`. Full
convention in [`.agents/rules/forms.md`](../../.agents/rules/forms.md); the
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

## Telling the user something worked, or didn't

Two surfaces, and the split is not a matter of taste:

- **A failure the reader has to act on stays on screen**, as
  `<Alert variant="destructive">` next to the thing that failed — above the
  first field of a form, inside the dialog that could not submit, above the
  card whose query failed. It is still there when they look back, which is the
  point. Never a toast: a submission error that has faded is an error the
  reader cannot re-read.
- **A success is transient**, and goes through `toast.success(...)` imported
  from `@flama/design-system-web`. The screen has already changed — the dialog
  closed, the row went away — so the message confirms rather than informs.
  Never an `Alert`: a success banner has no dismiss story and ends up living in
  the layout forever.

`<Toaster />` is mounted once in `app.tsx` and handed the app's own `theme`,
because the design system's `Toaster` reads `next-themes` and this app does not
run it — left alone it follows `prefers-color-scheme` and disagrees with the
theme toggle.

Field-level validation is neither of these: that is `Field` / `FieldError`, in
Forms above.

Toast copy lives under `toasts.*` in `@flama/translations`, one key per
message, in every locale. Import `toast` from the design system rather than
from `sonner` — the app does not depend on `sonner` directly, and the barrel is
where UI comes from.

## Delivery and first load

Identical to `apps/web`, down to the same `nginx.conf`, the same two `public/`
bootstrap scripts and the same budget check — read
[`apps/web/AGENTS.md`](../web/AGENTS.md#delivery-and-first-load) for the rules
and the reasoning. A change to one of those files almost always belongs in both
apps; the shared parts (`@flama/config/vite-chunks.mjs`, `consumeSessionPreload`
in `@flama/auth`, the lazy catalogs in `@flama/translations`) are shared exactly
so the two cannot drift apart silently.

## End-to-end tests

The repo-root `e2e/` package holds Playwright specs that drive the **real
stack** — this app against the running API, its Postgres and its Redis. Nothing
is stubbed: a spec that passed against a mock would say nothing about whether a
screen is wired to the API, which is the only thing these tests exist to answer.
The browser specs live in `e2e/tests/web/`; how to run them is in
[`e2e/README.md`](../../e2e/README.md).

Conventions:

- Start from `provisionedUser()` in `e2e/support/web.ts` — an account that
  already owns a workspace — unless the spec is about registration or
  onboarding. Registering creates an account and nothing else; an account with
  no workspace is sent to `/onboarding`, so a spec that registers through the
  UI and expects the dashboard is asserting a flow that no longer exists.
- Sign in through the form (`signInAs`); the session is an httpOnly cookie, so
  there is no storage state to reuse.
- Assert persistence with `reloadFromServer`, not `page.reload()`. The query
  cache is persisted to local storage with a stale window, so a plain reload can
  re-render the value the page itself just wrote.
- Address elements by role and accessible name. When a name collides with the
  app chrome, scope the query to a landmark rather than reaching for a test id.
- Every spec mints its own account and workspace, so the suite runs in parallel
  and nothing has to be put back. Stamp anything else you create with
  `Date.now()`: a fixed name makes the *first* test fail on the second run.
- **A screen wired to the API gets a spec.** Team was the largest surface in
  the app and the last to get one, which is the wrong way round.

## Commands

```bash
pnpm --filter @flama/web dev
pnpm --filter @flama/web build
pnpm --filter @flama/web preview
pnpm --filter @flama/web lint
pnpm --filter @flama/web test        # Vitest over src/lib and the shell hooks
pnpm --filter @flama/e2e e2e:web     # Playwright, against a live API
```
