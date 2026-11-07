# @flama/auth

## 0.2.0

### Minor Changes

- 28b2d1b: Extract the Better Auth configuration both sides must agree on into a new `@flama/auth` package: the user-fields schema (consumed by the server's `user.additionalFields` and the clients' `inferAdditionalFields`), the shared client plugin set (`admin`, `organization` with the `teams` flag), and the `unwrap()` / `toAuthSession()` helpers previously copy-pasted into both client adapters. The `./client` entry ships TypeScript sources to preserve Better Auth's type inference; the root entry is compiled CJS for the NestJS API.
- be7a583: Organizations are an optional starter feature (`organizations`).

  - `@flama/frontend-consumer`: the organization hooks and `organizationsKeys`
    move from `@flama/frontend-consumer/react` to
    `@flama/frontend-consumer/organizations`.
  - `@flama/auth`: adds `organizationClientPlugin()`.

- dc5d229: Two-factor authentication: Better Auth's `twoFactor` plugin (an authenticator app plus single-use backup codes), optional per user. The `AddTwoFactor` migration adds `user."twoFactorEnabled"` and the `twoFactor` table, and the profile reports the enrolment and whether the account has a password sign-in (`hasPassword`, computed from Better Auth's `account` table); an account made through a social provider is not offered two-factor, which only guards password sign-in. A password sign-in on an account with it on rejects with `TwoFactorRequiredError`, which the web and mobile login screens answer with a code step (`TwoFactorChallengeForm` in each kit, `useVerifyTwoFactor`). The web profile sets it up behind the switch that was read-only, with a QR code, and turns it off or replaces the backup codes. `IAuthClient` gains `verifyTwoFactor`, `enableTwoFactor`, `confirmTwoFactor`, `disableTwoFactor` and `generateBackupCodes`, so every app's client implements them. `TWO_FACTOR_ISSUER` names the account in authenticator apps.
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
  deployment). Measured on the current build:
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

- Updated dependencies [a033f38]
- Updated dependencies [c6da16b]
- Updated dependencies [755b293]
- Updated dependencies [548b754]
- Updated dependencies [7fdcefc]
- Updated dependencies [58a05e0]
- Updated dependencies [60cb5a9]
- Updated dependencies [4dbb193]
- Updated dependencies [0f089c6]
- Updated dependencies [e5d510f]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
- Updated dependencies [d532ef4]
- Updated dependencies [f96d51a]
- Updated dependencies [d06200f]
- Updated dependencies [dc5d229]
  - @flama/shared@1.0.0
