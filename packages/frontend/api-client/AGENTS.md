# @flama/api-client — Agent Instructions

Typed API client **auto-generated** from the API's OpenAPI/Swagger spec.
Consumed by `@flama/frontend-core`, `@flama/frontend-consumer` and
`@flama/frontend-admin`.

> Read the root [`CLAUDE.md`](../../../CLAUDE.md) first.

## Important: generated code

`src/generated/` is **generated — do not hand-edit it**. It is regenerated from
`apps/api`'s OpenAPI spec:

```bash
# from repo root, after API controller/DTO changes:
pnpm generate:api-client
# or directly:
pnpm --filter @flama/api-client generate
```

The `generate` script runs `openapi-ts` against `apps/api/openapi.json`, then
`scripts/openapi-postprocess.mjs`, which rewrites `src/index.ts` (every DTO
the API describes, exported by name from `src/generated/types.gen.ts`) and the
legacy services' index files, and runs `biome check --write` over the
barrels so running `generate` twice leaves no diff. A DTO has one definition,
the generated one: import it by name from `@flama/api-client`. A free-form
object in it is `{ [key: string]: unknown }`: parse it with the shared Zod
schema where you read it (see `UsersRepository.myPermissions`), never cast it.

The legacy services in `src/data-access/` are not regenerated: change one by
hand alongside its endpoint, and delete it with the endpoint. One that serves
an optional feature is in that feature's `paths` in
`scripts/starter/features.json` (the organization services are), because a
prune followed by its `regenerate` step removes the DTOs it imports.

## Layout

```
src/
├── generated/       # hey-api output: types, SDK, client, react-query (do not hand-edit)
├── data-access/     # legacy client (services), no longer regenerated
├── configure.ts     # ApiClientConfig, auth header helpers
└── index.ts         # written by `generate`
```

## When modifying

- To change the API surface, edit the **source of truth** — the controllers and
  Swagger decorators in `apps/api` (DTOs in `@flama/shared`) — then regenerate.
- Only hand-written code (`configure.ts`, the legacy services) is edited here.

## Commands

```bash
pnpm --filter @flama/api-client generate
pnpm --filter @flama/api-client build
```

See [`.agents/rules/frontend-architecture.md`](../../../.agents/rules/frontend-architecture.md).
