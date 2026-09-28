# apps/api — Agent Instructions

NestJS **Domain-Driven Hexagon** API. The authoritative references are
[`ARCHITECTURE.md`](./ARCHITECTURE.md) (layer model, module anatomy, the
"add a module" cookbook) and the scoped rules in `.agents/rules/`
(`nestjs-architecture.md`, `nestjs-di.md`, `typeorm.md`, `database-design.md`, `api-config.md`,
`rbac-roles.md`). Boundaries are enforced by `.dependency-cruiser.cjs`
(`pnpm --filter @flama/api arch`). This file adds the conventions that are easy
to get wrong.

## Mappers own all data-shape transformations

**Any operation that shapes, normalizes, or builds a data structure belongs in a
mapper — not inline in a service, handler, or controller.** This includes:

- Domain ↔ ORM ↔ response-DTO conversion (`Mapper<Domain, Orm, Response>`:
  `toPersistence` / `toDomain` / `toResponse`).
- Building a props object for a domain method (e.g. a `toSyncProps(data)` that
  assembles the fields for `entity.sync(props)`).
- Normalizing an external API result into a DTO (coercion, date parsing,
  unwrapping `{ member }` / `{ users }` envelopes).

Services and controllers stay thin: they orchestrate and delegate to a mapper
for the transform. Keep mappers **pure** (framework-free, no DI) so they are
trivially unit-testable and reusable.

### No `as`-cast soup — narrow once, in the mapper

Mapper functions **accept `unknown`** and narrow a single time with a small
helper, so callers pass values cast-free. Never write `x as unknown as { ... }`
double-casts or repeated `as Record<string, unknown>` at call sites.

```ts
// GOOD — mapper narrows once; the service is cast-free
export function mapMember(input: unknown): MemberResponseDto {
  const m = asRecord(input);
  return {
    id: String(m.id),
    userId: String(m.userId),
    role: String(m.role) /* ... */,
  };
}
// service:  return mapMember(unwrap(result, 'member'));

// BAD — dirty casts leaking into the service
const member =
  (result as unknown as { member?: Raw }).member ?? (result as unknown as Raw);
```

Shared shaping helpers (`asRecord`, `asArray`, `unwrap`, `unwrapArray`) live in
`src/auth/infrastructure/better-auth.util.ts`.

**One mapper per aggregate, named for it** — `subscription.mapper.ts`, not a
`*.mappers.ts` bag of loose functions. `pnpm check:api-structure` rejects the
plural name. Array and envelope mappers belong on the aggregate's mapper beside
the scalar ones, as methods.

## Better Auth façades

A module that exposes Better Auth plugin operations as REST endpoints
**delegates to `auth.api.*`**: Better Auth owns the tables, so there is no
aggregate to write. Not owning the data is a reason to have a **port**, not a
reason to skip the module contract (see [`ARCHITECTURE.md`](./ARCHITECTURE.md)):

- a port in `infrastructure/` describing what the use cases need, and a
  gateway beside it that speaks to `auth.api.*` through `betterAuthHeaders`;
- the module's invoker beside that gateway, built with `betterAuthInvoker`,
  wrapping every call so Better Auth's `APIError` becomes a catalog problem
  document keeping the upstream code as `upstreamCode` — a bare
  `HttpException` loses the code (see "Structured errors" in
  `.agents/rules/nestjs-architecture.md`);
- every result normalized through the module's mapper;
- one use-case slice per operation.

`profile/infrastructure/` is the port and gateway to copy. `organizations/` is
mid-migration: its root-level services and multi-route controllers are on the
ledgers of `pnpm check:api-structure` and `.dependency-cruiser.cjs`. Do not copy
it, and do not add a route to it in the old shape — a new operation goes in as
a slice.

## Config

Config is composed from `registerAs` factories in `src/config/` (`app`,
`database`, `redis`, `email`, `storage`, `oauth`), loaded in
`AppModule` and read via `ConfigService`. Optional-credential config (OAuth,
S3, SMTP) uses genuinely optional schema keys (`z.string().optional()`,
never a sentinel default or `getOrThrow`) so the app boots without those env
vars; each such feature is declared in `src/capabilities/capabilities.module.ts`,
logged at startup, and the client-facing subset (`CLIENT_CAPABILITIES`) is
served by `GET /health/capabilities` — see `api-config.md`. The TypeORM CLI datasource
(`src/config/data-source.ts`) and the seed (`src/database/seed.ts`) keep their
own explicit `entities` arrays: **register every new ORM entity in both**, plus
the module's `TypeOrmModule.forFeature`.

## Commands

```bash
pnpm --filter @flama/api dev                # watch mode
pnpm --filter @flama/api arch               # dependency-cruiser boundary check
pnpm --filter @flama/api test               # unit tests
pnpm --filter @flama/api test:integration   # needs Docker (Postgres + Redis)
pnpm --filter @flama/api migration:generate -- src/migrations/<Name>  # generate a migration (name/path is required)
pnpm --filter @flama/api migration:run
pnpm --filter @flama/api generate:openapi   # emit openapi.json
```
