# @flama/env

## 0.2.0

### Minor Changes

- 25ff19f: One `.env` at the repo root, documented by a root `.env.example`.

  New `@flama/env` package locates the workspace root (walking up to
  `pnpm-workspace.yaml` or a `package.json` with `workspaces`), loads `.env`
  then `.env.local` (local wins between the files), and never overwrites a
  value already in `process.env` — real environment variables always win, so
  the same loader is correct in CI and in production containers.

  - `apps/api` entry points (`main.ts`, TypeORM CLI `data-source.ts`, seed,
    OpenAPI generation, `auth.ts`) import `@flama/env/load` instead of
    `dotenv/config`, which resolved `.env` against `process.cwd()`. The TypeORM
    CLI previously loaded no env file at all.
  - `apps/web` reads the root file via Vite's `envDir`; a `.env` inside the app
    directory is no longer read.
  - `apps/mobile` loads the root file in `app.config.ts` before Metro bundles,
    and its deep-link `scheme` now reads `MOBILE_SCHEME` — the same variable the
    API uses for its trusted origin — instead of a hardcoded copy.
  - Stale variables removed: the `JWT_SECRET` fallback for `BETTER_AUTH_SECRET`
    and `JWT_REFRESH_SECRET` / `NEXT_PUBLIC_API_URL` in
    `docker/docker-compose.prod.yml` (which now passes `BETTER_AUTH_SECRET` /
    `BETTER_AUTH_URL`); `SENTRY_DSN` / `EXPO_PUBLIC_SENTRY_DSN` were documented
    but never read and are not carried over.

  The three per-app `.env.example` files are replaced by a single root
  `.env.example` documenting every variable the repo reads.

### Patch Changes

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
