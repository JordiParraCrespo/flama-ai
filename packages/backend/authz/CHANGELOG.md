# @flama/backend-authz

## 1.0.0

### Major Changes

- 58a05e0: Every dependency moves to its latest release, majors included: Expo SDK 58
  (React Native 0.88, React 19.3), NestJS 12, TypeORM 1, Zod 4, bullmq 6,
  ioredis 6, CASL 7, nestjs-zod 5, nestjs-pino 5, react-native-gesture-handler 3,
  better-auth 1.7. Versions on the mobile side are the ones SDK 58 lists, so
  `expo install --check` is clean.

  What a consumer has to move with:

  - **Zod 4.** The schemas in `@flama/shared` are Zod 4 schemas, and
    `createZodErrorMap` returns a Zod 4 error map (`core.$ZodErrorMap`), passed
    as `error`, not `errorMap`. The kits' `zod` peer is `^4`.
  - **NestJS 12** in every backend package, and `typeorm` `^1` as
    `@flama/backend-authz`'s peer.
  - **nestjs-zod 5** has no `patchNestJsSwagger`: the API runs the document
    through `cleanupOpenApiDoc` instead. The document now carries each schema's
    bounds and defaults, and Zod 4's `uuid()` is the RFC check, so a lookalike id
    such as `11111111-1111-1111-1111-111111111111` no longer passes.
  - **CommonJS packages resolve `node16`.** CASL 7 publishes its types only
    through `exports`, which the deprecated `node` resolution never read.
  - **React Native 0.88** types its strict API by default; the mobile tsconfigs
    select the legacy types with `react-native-legacy-deep-imports`, which
    NativeWind's `className` augmentation still targets.

  `@flama/shared` gains a `flama-source` export condition pointing at its
  TypeScript source. `apps/web` resolves it, because a CommonJS `require('zod')`
  pulls in all of Zod 4, every locale included, beside the copy the frontend
  packages import as ESM: 94KB gzipped on first load.

### Minor Changes

- 755b293: Add the authorization kernel: a feature module declares one resource object and
  gets tenant isolation, team scoping, row-level SQL filtering, a role-builder
  entry and a credential scope without writing an authorization check.

  Also closes two defects in the existing system: `PoliciesGuard` allowed any
  authenticated caller through a route that declared no policy, and roles were
  global (`role.name` was unique table-wide), so two tenants could not both define
  a `manager` role.

### Patch Changes

- 75a4a13: A bypass `AccessScope` (platform tier, `manage all`) skips only the slice within the tenant. `applyAccessScope` still applies the organization clause whenever the request names one, so an operator acting in a workspace no longer lists every workspace's rows; only a bypass with no active organization reaches every tenant.
- a15639c: A platform admin, or anyone holding `manage all`, no longer reaches other
  people's rows of a resource with no organization key. Such a resource belongs
  to a person, not a tenant; the access-scope bypass, which keeps the workspace
  boundary for every other resource, removed the owner filter entirely.
  `applyAccessScope` no longer lets a bypass or an `'all'` grant widen it: its
  rows are the caller's own and the ones granted by id. `canGrantScope` takes the
  resource definition and no longer lets a bypass or an `'all'` holder grant such
  a row (an unregistered type is held to the same rule); only a row already
  granted by name can be passed on. Ported from Oppenheimer.
- Updated dependencies [a033f38]
- Updated dependencies [c6da16b]
- Updated dependencies [755b293]
- Updated dependencies [548b754]
- Updated dependencies [7fdcefc]
- Updated dependencies [af46e89]
- Updated dependencies [e5a762a]
- Updated dependencies [58a05e0]
- Updated dependencies [60cb5a9]
- Updated dependencies [4dbb193]
- Updated dependencies [b079e83]
- Updated dependencies [0f089c6]
- Updated dependencies [e5d510f]
- Updated dependencies [e825c1a]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
- Updated dependencies [d532ef4]
- Updated dependencies [4c48c8b]
- Updated dependencies [f96d51a]
- Updated dependencies [d06200f]
- Updated dependencies [dc5d229]
- Updated dependencies [20f35fa]
  - @flama/shared@1.0.0
  - @flama/backend-core@1.0.0
