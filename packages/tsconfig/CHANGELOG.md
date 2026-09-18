# @flama/tsconfig

## 0.2.0

### Minor Changes

- d06200f: Name the config package after what it holds, and put the endpoint policies next
  to CASL.

  `@flama/config` is now `@flama/tsconfig`, in `packages/tsconfig/`. "Config" said
  nothing — the repo has seven other things that answer to it (`src/config/` in
  the API, `ShellConfig`, `vite.config.ts`, the root `.env`) — while the package
  holds tsconfig presets and the two build-time helpers that travel with them
  (`vite-chunks.mjs`, `depcruise/*.cjs`). Every `extends`, devDependency,
  Dockerfile `COPY` and doc reference moved with it; nothing else changed.

  `@flama/shared` no longer exports `./navigation`. `SCREENS` paired a web route
  (`/team`, `/api-tokens`) with the endpoint behind it and the rules that endpoint
  demands. The endpoint half is a real contract and stays, as `ENDPOINT_POLICIES`
  in `@flama/shared/permissions` — keyed by the path Nest mounts the handler at,
  which is what `apps/api/src/auth/__tests__/endpoint-policies.spec.ts` (renamed
  from `screen-policies.spec.ts`) pins the controllers to.

  The route half is deleted rather than rehoused. Those five paths are not routes
  any app mounts: `apps/web` serves `/dashboard`, `/settings` and
  `/settings/api-tokens`, `apps/admin-web` serves `/users` and `/roles`, and
  neither read the catalog — both nav files write their rows out by hand. A list
  of one product's leftover URLs does not earn a home in the platform kit both
  Vite apps compile. The rule that survives is smaller and is now what the docs
  say: a gated nav row takes `policies: ENDPOINT_POLICIES['/tokens']` where the
  row is declared, never a literal rule list, and the route string stays in the
  app that mounts it.

  The catalog also carries its own invariants now. `ENDPOINT_POLICIES` is typed
  `Record<string, readonly [EndpointPolicy, ...EndpointPolicy[]]>`, so an empty
  rule list and a misspelled member are both compile errors — which is what the
  package-local spec was asserting at runtime, so it is gone. `HANDLERS` in the
  API test is a `Record<GuardedEndpoint, …>`, so a new catalog entry fails to
  compile until a handler is named for it. Nothing casts.

  `permissions/index.ts` became a barrel over `abilities.ts` (a verbatim move of
  the old file) and `endpoint-policies.ts`.

- 48d1b41: Make the web delivery path carry its weight: compression, caching, a real CSP,
  and a budget that keeps first load honest.

  The built SPAs were served by a 14-line nginx config that set none of the three
  things nginx does not do by default. The official image ships `gzip` commented
  out, so the ~1.1MB entry chunk went over the wire uncompressed; hashed assets
  got no `Cache-Control`, so every repeat visit revalidated all ~50 chunks; and
  the Content-Security-Policy that `index.html` and `public/theme-init.js` were
  already written against — both keep the theme bootstrap in a separate file
  specifically to avoid an inline-script exception — did not exist. All three are
  now set, with the policy's third-party origins in one substituted
  `CSP_EXTRA_ORIGINS` variable (defaulted in the Dockerfile, overridable per
  deployment through `helm/flama/values.yaml`). Measured on the current build:
  1,130KB → 324KB for the entry chunk, 152KB → 24KB for the stylesheet.

  On the critical path itself:

  - **Only the default locale is bundled.** `@flama/translations` grew two
    narrower entrypoints — `/locales` for metadata and `/lazy` for one catalog per
    chunk — because importing `locales` or `Messages` from the root barrel put
    every catalog in the entry chunk. The Spanish catalog was measurably inside
    what an English reader downloaded before anything rendered.
  - **The session lookup starts before the bundle parses.** Nothing renders until
    `useSessionRestore` resolves, and that request used to begin only after the
    bundle had downloaded, parsed and mounted React. `public/session-preload.js`
    issues it from `<head>`; `consumeSessionPreload` in `@flama/auth` takes the
    answer once, and falls back to the auth client for anything unusable, so the
    worst case is a wasted request rather than a reader treated as signed out.
  - **Route chunks are prefetched on intent.** `defaultPreload: 'intent'` means
    hovering a link fetches the route it points at, instead of every navigation
    starting a request.
  - **Dependencies are chunked per library** via a shared
    `@flama/tsconfig/vite-chunks.mjs`, so a release invalidates app code (42KB) and
    leaves the vendor chunks cached (263KB). Splitting costs ~48KB gzipped on a
    cold first load, which is the trade the `immutable` caching above pays for —
    the number is recorded in that file.
  - `sideEffects` declared on `@flama/design-system-web` (CSS excepted),
    `@flama/translations` and `@flama/api-client`, worth ~7KB gzipped.

  And so it stays fixed: `pnpm check:bundle` gzips everything the built
  `index.html` references and fails past a committed budget, in CI after
  `pnpm build`. Vite's own 500KB warning prints and passes, which is how a 1.1MB
  entry chunk went unnoticed. The Playwright `api` project runs in CI too — 69
  specs that existed and that no job ran, five of which had been failing since the
  console mailbox line gained a `Locale:` segment the e2e helper never learned
  about. The `web` project stays out until it is repaired: it drives a `/team`
  route `apps/web` no longer has, and 15 of its 64 specs fail on `main`. See
  `e2e/README.md`.
