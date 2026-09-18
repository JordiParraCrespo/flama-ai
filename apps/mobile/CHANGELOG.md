# @flama/mobile

## 0.2.0

### Minor Changes

- c27a7f4: Port the rn-bedrock mobile stack into Flama: Expo SDK 57 + dev client, nitro-fetch, MMKV, Sentry/RevenueCat optional keys, gorhom sheet forks, Legend List, expo-image, nano-icons, hey-api client generation, and namespaced translation files.

  - `@flama/frontend-mobile` owns the shared mobile glue: the MMKV query
    persistence wrapper, the polyfills, `FormField` and SecureStore.
  - `@flama/frontend-core` gains `ConfigManager` under `@flama/frontend-core/config`.

- 132c189: Give the Expo apps the same sign-in screens as the web apps.

  `@flama/frontend-mobile` now owns the shared auth frame, forms, password
  controls, social providers, and forgot/reset flows used by both Expo apps.
  `@flama/design-system-mobile` adds the brand mark, and both apps receive the
  matching theme tokens, inline translated failures, and terminal success states.

### Patch Changes

- 28b2d1b: Extract the Better Auth configuration both sides must agree on into a new `@flama/auth` package: the user-fields schema (consumed by the server's `user.additionalFields` and the clients' `inferAdditionalFields`), the shared client plugin set (`admin`, `organization` with the `teams` flag), and the `unwrap()` / `toAuthSession()` helpers previously copy-pasted into both client adapters. The `./client` entry ships TypeScript sources to preserve Better Auth's type inference; the root entry is compiled CJS for the NestJS API.
- b0d0d25: Mount the root navigator before applying authentication guards so the mobile
  app can start without Expo Router throwing an early-navigation error. Session
  loading and restore failures remain visible as full-screen overlays. Refresh
  the login screen with the Flama auth layout, theme control, session preference,
  and deployment-aware social login options.
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
  - `apps/mcp` entry points load the root file too (a no-op outside a
    workspace), and the HTTP port now prefers `MCP_PORT` over `PORT` so a shared
    root `.env` can't make it collide with the API.
  - Stale variables removed: the `JWT_SECRET` fallback for `BETTER_AUTH_SECRET`
    and `JWT_REFRESH_SECRET` / `NEXT_PUBLIC_API_URL` in
    `docker/docker-compose.prod.yml` (which now passes `BETTER_AUTH_SECRET` /
    `BETTER_AUTH_URL`); `SENTRY_DSN` / `EXPO_PUBLIC_SENTRY_DSN` were documented
    but never read and are not carried over.

  The three per-app `.env.example` files are replaced by a single root
  `.env.example` documenting every variable the repo reads.

- Updated dependencies [97f6f1e]
- Updated dependencies [23e7181]
- Updated dependencies [755b293]
- Updated dependencies [7fdcefc]
- Updated dependencies [af46e89]
- Updated dependencies [28b2d1b]
- Updated dependencies [c27a7f4]
- Updated dependencies [510fb79]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
- Updated dependencies [d532ef4]
- Updated dependencies [25ff19f]
- Updated dependencies [d06200f]
- Updated dependencies [e6895ae]
- Updated dependencies [132c189]
- Updated dependencies [48d1b41]
  - @flama/design-system-mobile@0.3.0
  - @flama/frontend-core@0.3.0
  - @flama/frontend-mobile@0.2.0
  - @flama/shared@1.0.0
  - @flama/api-client@1.0.0
  - @flama/translations@0.3.0
  - @flama/frontend-consumer@0.3.0
  - @flama/auth@0.2.0
  - @flama/env@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [4943eff]
- Updated dependencies [e209380]
- Updated dependencies [a93cf5d]
- Updated dependencies [55e1d1a]
- Updated dependencies [9c3e158]
- Updated dependencies [68348a6]
- Updated dependencies [719859f]
  - @flama/shared@0.2.0
  - @flama/frontend@0.2.0
  - @flama/api-client@0.2.0
  - @flama/translations@0.2.0
