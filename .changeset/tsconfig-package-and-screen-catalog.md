---
"@flama/tsconfig": minor
"@flama/shared": minor
"@flama/frontend-web": minor
"@flama/api": patch
"@flama/web": patch
"@flama/admin-web": patch
---

Name the config package after what it holds, and stop shipping the web's route
paths to the server.

`@flama/config` is now `@flama/tsconfig`, in `packages/tsconfig/`. "Config" said
nothing — the repo has seven other things that answer to it (`src/config/` in
the API, `ShellConfig`, `vite.config.ts`, the root `.env`) — while the package
holds tsconfig presets and the two build-time helpers that travel with them
(`vite-chunks.mjs`, `depcruise/*.cjs`). Every `extends`, devDependency,
Dockerfile `COPY` and doc reference moved with it; nothing else changed.

`@flama/shared` no longer carries the screen catalog. `SCREENS` paired a web
route (`/team`, `/api-tokens`) with the endpoint behind it and the CASL rules
that endpoint demands, and it sat in the package both tiers install — so the
API's own drift test read route paths it has no opinion about, and every
consumer of `@flama/shared` compiled a list of one client's URLs. The pairing
is worth keeping; the reason it lived there was not.

It splits along the line that was already there:

- **`ENDPOINT_POLICIES`** (`@flama/shared/permissions`) declares what each
  guarded endpoint demands, keyed by the path Nest mounts it at. That is the
  API contract, and it is what
  `apps/api/src/auth/__tests__/endpoint-policies.spec.ts` — renamed from
  `screen-policies.spec.ts` — pins the controllers to.
- **`SCREENS`** (`@flama/frontend-web`, `src/shell/lib/screens.ts`) maps this
  platform's routes onto those endpoints and reads the rules from
  `ENDPOINT_POLICIES` rather than restating them. `apps/mobile` reaches the same
  handlers under entirely different route names, which is the whole argument for
  where the split falls.

The guard is unchanged in strength and slightly tighter: the API test still
fails when a `@CheckPolicies` drifts from the catalog, still asserts each
handler is mounted where the catalog says, and now needs no frontend package to
run. `permissions/index.ts` became a barrel over `abilities.ts` and
`endpoint-policies.ts`; the `@flama/shared/navigation` subpath export is gone.
