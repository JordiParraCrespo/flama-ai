# @flama/auth — Agent Instructions

Shared Better Auth configuration: the user-fields schema, the plugin options
both sides must agree on, and the client-side `unwrap`/`toAuthSession` helpers.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first.

## The one rule that matters

**`./client` ships TypeScript sources on purpose — never give it a build
step.** Better Auth derives client endpoint/session types from the plugin
tuple through inference chains that do not survive `.d.ts` emission. The
`exports["./client"]` map points at `src/client.ts`; Vite and Metro transpile
it in the consuming apps. Only the root entry (consumed by the NestJS API,
whose `tsc` cannot compile sources out of `node_modules`) is built to
CJS + `.d.ts` — and it must export only plain, explicitly typed values.

Consequences:

- `src/client.ts` is excluded from `tsconfig.json`'s build; it is type-checked
  by the consuming apps (`apps/web` runs `tsc -b` in its build).
- Anything exported from the root entry must keep literal types
  (`as const satisfies ...`), or Better Auth's inference on the server degrades.

## What goes where

- Config both sides must agree on (user fields, the org `teams` flag) → here.
- Server-only options (database, hooks, emails, admin roles, OAuth) →
  `apps/api/src/auth/auth.ts`.
- Platform glue (Expo plugin, SecureStore, cookies) → the apps.
- The `IAuthClient` contract → `@flama/frontend` (this package must not depend
  on it; `AuthSession` here mirrors it structurally).

## Commands

```bash
pnpm --filter @flama/auth build
pnpm --filter @flama/auth test
pnpm --filter @flama/auth lint
```
