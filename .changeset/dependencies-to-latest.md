---
"@flama/shared": major
"@flama/frontend-core": major
"@flama/frontend-web": major
"@flama/frontend-mobile": major
"@flama/backend-core": major
"@flama/backend-authz": major
"@flama/backend-cache": major
"@flama/backend-email": major
"@flama/backend-queue": major
"@flama/backend-storage": major
"@flama/design-system-mobile": major
"@flama/api": minor
"@flama/web": minor
"@flama/mobile": minor
"@flama/api-client": patch
"@flama/auth": patch
"@flama/backend-ddd": patch
"@flama/backend-i18n": patch
"@flama/env": patch
"@flama/frontend-consumer": patch
"@flama/design-system-web": patch
"@flama/react-hooks": patch
"@flama/tsconfig": patch
---

Every dependency moves to its latest release, majors included: Expo SDK 58
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
