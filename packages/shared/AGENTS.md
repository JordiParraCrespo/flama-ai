# @flama/shared — Agent Instructions

Cross-cutting contracts shared between backend and frontend: Zod schemas,
types, constants, and CASL permission helpers.

> Read the root [`CLAUDE.md`](../../CLAUDE.md). The RBAC rules in
> [`.agents/rules/rbac-roles.md`](../../.agents/rules/rbac-roles.md) also scope
> this package.

## Layout

```
src/
├── schemas/       # Zod schemas — single source of truth for DTOs
├── types/         # shared TS types
├── constants/     # shared constants
├── permissions/   # CASL ability helpers
└── index.ts
```

## What lives here

- **Zod schemas** are the single source of truth for DTOs. Define once here;
  the API validates against them and the frontend reuses them. Do not duplicate
  DTO shapes in apps.
- **CASL helpers**: `defineAbilitiesFromPermissions` (DB-driven, the source of
  truth) and the legacy `defineAbilitiesFor` fallback.
- **Types**: `Role` (free-form role-name `string`), `PermissionDefinition`,
  `AuthProvider`, `JwtPayload`, `TokenPair`, `PaginationParams`,
  `PaginatedResponse<T>`.
- **Constants**: `AUTH`, `PAGINATION`, `ROLES`, `SYSTEM_ROLES`,
  `SYSTEM_ROLE_PERMISSIONS`, `QUEUE_NAMES`.

## When modifying

- Changing a schema/type may ripple into `apps/api`, `@flama/frontend`, and
  `@flama/api-client`. Check consumers before altering the public surface.
- After schema changes that affect API DTOs, regenerate the client
  (`pnpm generate:api-client`).

## Commands

```bash
pnpm --filter @flama/shared build
pnpm --filter @flama/shared dev
```
