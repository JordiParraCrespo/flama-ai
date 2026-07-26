# @flama/api-client

Typed HTTP client for `apps/api`, **generated** from the API's OpenAPI schema.
Do not hand-edit files under `src/data-access/api/openapi` — they are overwritten
on every regeneration.

## Regenerating

```bash
pnpm generate:api-client   # from the repo root
```

This runs `openapi-typescript-codegen` against `apps/api/openapi.json` and then a
post-process step (`scripts/openapi-postprocess.mjs`). Regenerate after any change
to an API endpoint or its Swagger decorators.

## What's inside

| Export path                  | Contents                                   |
| ---------------------------- | ------------------------------------------ |
| `@flama/api-client`          | Client entry point                         |
| `@flama/api-client/models`   | Generated request/response models          |
| `@flama/api-client/services` | Generated per-tag service classes (`*Api`) |

## No runtime dependencies — by design

`package.json` intentionally declares **no `dependencies`** field, only
`devDependencies`. The generated client is self-contained (it uses the platform
`fetch`); the consuming app supplies configuration. Please keep it that way —
don't add an HTTP library here. This is not an oversight; see the `"//"` note in
`package.json`.

## Consumed by

`packages/frontend` (which wires the client into its data-access layer).
