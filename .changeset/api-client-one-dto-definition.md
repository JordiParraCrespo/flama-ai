---
"@flama/api-client": patch
---

Let one generator own every DTO name. `src/common/models/*` held
openapi-typescript-codegen output that nothing regenerates any more, so each
name had two definitions and the package resolved the frozen one. The
post-processing step now rewrites each of those files into a re-export of the
hey-api type of the same name, deletes a re-export whose DTO left the API (what
a pruned feature leaves behind), and exports by name the DTOs only the hey-api
output defines (`CreateFlagSegmentRequest`, `FlagChangePaginationMetaDto`,
`ToggleFeatureFlagRequest`, `UpdateFeatureFlagRequest`,
`UpdateFlagSegmentRequest`). It also runs `biome check --write` over the two
barrels Biome checks, so `pnpm generate:api-client` leaves no diff when run
twice.

The shapes are unchanged except where the old models were loose: a free-form
object is now `{ [key: string]: unknown }` rather than `Record<string, any>`
(role permissions and rule conditions, organization metadata and teams, the
caller's effective permissions).
