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
post-processing step (`scripts/openapi-postprocess.mjs`) that rebuilds the
index files of the legacy client. That legacy layer — `src/data-access/` and
`src/common/models/` — is no longer regenerated: delete a model with the
endpoint it served, and keep its scope and capability types imported from
`@flama/shared` (`Scope`, `ScopeResource`, `ClientCapabilities`), never
spelled out.

## Layout

```
src/
├── generated/       # hey-api SDK/client/react-query output (re-exported as heyApiSdk/heyApiClient/heyApiQuery)
├── data-access/     # legacy client (services), no longer regenerated
├── common/          # hand-written wrappers/config that survive regeneration
├── configure.ts     # ApiClientConfig, auth header helpers
└── index.ts
```

## When modifying

- To change the API surface, edit the **source of truth** — the controllers and
  Swagger decorators in `apps/api` (DTOs in `@flama/shared`) — then regenerate.
- Only hand-written helpers (e.g. under `common/`) should be edited here.

## Commands

```bash
pnpm --filter @flama/api-client generate
pnpm --filter @flama/api-client build
```

See [`.agents/rules/frontend-architecture.md`](../../../.agents/rules/frontend-architecture.md).
