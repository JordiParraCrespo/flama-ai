# @flama/api — Agent Instructions

NestJS REST API. This is the backend entrypoint of the monorepo.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first for repo-wide conventions.

## Architecture

`apps/api` follows **Domain-Driven Hexagon** architecture. The authoritative
guide lives in [`ARCHITECTURE.md`](./ARCHITECTURE.md): layer model, module
anatomy, `@flama/backend-ddd` building blocks, and the "add a module" cookbook.

Use the `/scaffold-module` skill to generate a convention-compliant module
skeleton. Boundaries are enforced by [`.dependency-cruiser.cjs`](./.dependency-cruiser.cjs)
via `pnpm arch` (runs in CI and a Claude Code Stop hook).

## Detailed rules

Scoped rules in [`.claude/rules/`](../../.claude/rules/):

- `nestjs-di.md` — DI imports, `import type` restrictions, repository-port DI tokens
- `nestjs-architecture.md` — DDD vertical slices, CQRS handlers, domain layer, ports/adapters, mappers, errors, events
- `typeorm.md` — union-typed columns, persistence-model (ORM) conventions
- `api-config.md` — OAuth graceful handling, controllers, Swagger decorators, rate limiting, versioning
- `rbac-roles.md` — DB-backed dynamic RBAC, `@CheckPolicies`/`PoliciesGuard`, resource scoping

## Layout

```
src/
├── app.module.ts     # root module
├── main.ts           # bootstrap
├── auth/             # authentication (JWT + OAuth providers)
├── config/           # typed config modules
├── database/         # TypeORM datasource, entities wiring
├── health/           # health checks
├── migrations/       # TypeORM migrations
├── queue/            # BullMQ processors
├── roles/            # RBAC role/permission CRUD
└── users/            # example DDD module
```

## Commands

```bash
pnpm --filter @flama/api dev                # watch mode
pnpm --filter @flama/api arch               # dependency-cruiser boundary check
pnpm --filter @flama/api test               # unit tests
pnpm --filter @flama/api test:integration   # needs Docker (Postgres + Redis)
pnpm --filter @flama/api migration:generate # generate a migration
pnpm --filter @flama/api migration:run
pnpm --filter @flama/api generate:openapi   # emit openapi.json
```

## When modifying

- New endpoints need Swagger decorators — they feed the generated `@flama/api-client`.
- After changing controllers/DTOs, run `pnpm generate:api-client` from the repo root.
- DTOs/schemas belong in `@flama/shared` (Zod), not duplicated here.
- Protect routes with `@UseGuards(AuthGuard, PoliciesGuard)` + `@CheckPolicies(...)`.
