# @flama/api

The NestJS REST API: authentication through Better Auth, organizations and
invitations, users and roles, profiles, API tokens, and the endpoints the
CLI and the MCP server drive. Every response error is an RFC 7807 problem
document; every endpoint carries Swagger decorators and a scope, from which
`@flama/api-client` is generated.

## Running it

```bash
pnpm docker:dev                       # Postgres + Redis
pnpm --filter @flama/api dev          # http://localhost:3001, Swagger at /docs
pnpm --filter @flama/api test
pnpm --filter @flama/api test:integration
pnpm --filter @flama/api arch         # dependency-cruiser boundaries
pnpm generate:api-client              # after an endpoint changes
```

Configuration is the root `.env`; `.env.example` documents every variable.

## Layout

One Domain-Driven Hexagon module per bounded context under `src/<module>/`:
`domain/`, `database/`, `commands/`, `queries/`, `dtos/`, a mapper and a
module file. [`ARCHITECTURE.md`](./ARCHITECTURE.md) is the layer model and the
"add a module" cookbook; `/scaffold-module` produces the skeleton.

## Depends on / used by

Depends on `@flama/shared`, `@flama/auth`, `@flama/backend-*` and
`@flama/backend-i18n` (with `@flama/translations`). Used by every app and
by `apps/runner`, which it delegates long-lived work to.

See [`AGENTS.md`](./AGENTS.md) for the conventions.
