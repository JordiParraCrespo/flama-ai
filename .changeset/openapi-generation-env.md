---
"@flama/api": patch
"@flama/api-client": patch
---

`pnpm generate:api-client` needs no `.env`: the OpenAPI generator stands in a
placeholder `BETTER_AUTH_SECRET` when none is set (`apps/api/src/openapi-env.ts`),
and `openapi.json` is formatted with Biome so a regeneration with no API change
leaves git clean.
