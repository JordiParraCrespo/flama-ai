# @flama/admin-mobile — Agent Instructions

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first, then [`ARCHITECTURE.md`](./ARCHITECTURE.md).
> The native control plane: users and roles. Consumer features stay in `apps/mobile`.

## Stack

- Expo + expo-router (`app/`); **expo-dev-client only**, not Expo Go
- NativeWind + `@flama/design-system-mobile`; glue from `@flama/frontend-mobile`
- `expo-secure-store` for secrets (prefix `flama-admin`, not `apps/mobile`'s
  `flama`); **MMKV** for preferences and the persisted query cache
- React Hook Form + `useZodResolver`, one `Controller` per field — React Native
  has no DOM refs, so `register()` does not work
- `index.ts` imports `@flama/frontend-mobile/polyfills` **first**: nitro-fetch
  replaces global `fetch` before anything captures it

## Where code goes

- A screen → `features/<module>/screens/`, mounted by a route under 120 lines.
- A form → `features/<module>/forms/` (props in, `onSubmit` out; no fetching).
- A sheet → `features/<module>/dialogs/`, one per file, owns its mutation.
- A helper two screens use → `@flama/frontend-mobile`, not a second copy and not
  `lib/` (only `flama.ts`, `auth-client.ts`, `query.ts`).
- Logic — entities, repositories, query hooks → `@flama/frontend-admin` or
  `@flama/frontend-core`. Never `@flama/frontend-consumer`.

## Before pushing

```bash
pnpm --filter @flama/admin-mobile lint && pnpm --filter @flama/admin-mobile test
pnpm --filter @flama/admin-mobile arch && pnpm check:structure
```

## Patterns agents get wrong

- Adding a registration screen. `lib/auth-client.ts` throws from `signUp` and
  passes `requestSignUp: false`: accounts are provisioned by an administrator.
- Reaching for `useEffect` in a screen. Biome allows it only in `hooks/`; the
  one exception is `app/_layout.tsx`, whose single commented effect loads the
  config manager and the purchases SDK once per launch.
- Naming a feature after the page. Only kernel modules and `admin-users` /
  `roles` are allowed here; this app has no allowlist entry.

Placement is [`.agents/rules/frontend-architecture.md`](../../.agents/rules/frontend-architecture.md);
forms are [`.agents/rules/forms.md`](../../.agents/rules/forms.md).
