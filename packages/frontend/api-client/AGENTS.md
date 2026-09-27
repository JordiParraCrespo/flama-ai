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

The `generate` script runs `openapi-ts` against `apps/api/openapi.json`, then a
post-processing step (`scripts/openapi-postprocess.mjs`) that:

- makes `src/common/models/` one one-line re-export of
  `src/generated/types.gen.ts` per DTO (`*Dto`, `*Request`) the API describes,
  so each DTO has exactly one definition and it is the generated one, and every
  DTO is exported by name from the package root — a consumer never hand-writes
  a wire shape. Do not hand-edit those files; the next run puts them back. The
  directory follows the API both ways: a DTO that left it (a pruned feature, a
  deleted endpoint) loses its file, one that arrived (a plugin) gains one. A
  hand-written model with no generated counterpart is kept and named in a
  warning;
- rebuilds the index files, and runs `biome check --write` over the two
  barrels Biome checks, so running `generate` twice leaves no diff.

The legacy services in `src/data-access/` are not regenerated: change one by
hand alongside its endpoint, and delete it with the endpoint. One that serves
an optional feature is in that feature's `paths` in
`scripts/starter/features.json` (the organization services are), because a
prune followed by its `regenerate` step removes the models it imports.

The generated types are strict where the old models were loose: a free-form
object is `{ [key: string]: unknown }`, not `Record<string, any>`. Narrow it
where you read it (see `UsersRepository.myPermissions`); never cast it.

## Layout

```
src/
├── generated/       # hey-api SDK/client/react-query output (re-exported as heyApiSdk/heyApiClient/heyApiQuery)
├── data-access/     # legacy client (services), no longer regenerated
├── common/models/   # one re-export per DTO, written by the postprocess step
├── configure.ts     # ApiClientConfig, auth header helpers
└── index.ts
```

## When modifying

- To change the API surface, edit the **source of truth** — the controllers and
  Swagger decorators in `apps/api` (DTOs in `@flama/shared`) — then regenerate.
- Only hand-written code (`configure.ts`, the legacy services) is edited here;
  `src/generated/`, `src/common/` and both `index.ts` barrels are written by
  `generate`.

## Commands

```bash
pnpm --filter @flama/api-client generate
pnpm --filter @flama/api-client build
```

See [`.agents/rules/frontend-architecture.md`](../../../.agents/rules/frontend-architecture.md).
