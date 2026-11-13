# @flama/backend-cache

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

- 69f4247: Observability for the cache and the logs. The API exports `cache_reads_total` for the Redis cache (hits, misses, errors by key namespace), with dashboard panels and an alert. `LOG_FILE` also writes the API's log lines as JSON to a file, which `pnpm monitoring:up` now ships to Loki through Grafana Alloy, and `pnpm logs` queries with LogQL. `@flama/backend-cache` takes an `onRead` observer (`CacheModule.register(options)` / `registerAsync`); `@flama/backend-core`'s logging takes a `file`.

### Patch Changes

- 1a5a032: `RedisCacheService` no longer connects when it is built: the client is created by the first command and quit in `onModuleDestroy`, so the app boots without Redis for `generate:openapi` and leaves no connection open after `app.close()`.
