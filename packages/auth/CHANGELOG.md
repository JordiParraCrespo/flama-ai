# @flama/auth

## 0.2.0

### Minor Changes

- 28b2d1b: Extract the Better Auth configuration both sides must agree on into a new `@flama/auth` package: the user-fields schema (consumed by the server's `user.additionalFields` and the clients' `inferAdditionalFields`), the shared client plugin set (`admin`, `organization` with the `teams` flag), and the `unwrap()` / `toAuthSession()` helpers previously copy-pasted into both client adapters. The `./client` entry ships TypeScript sources to preserve Better Auth's type inference; the root entry is compiled CJS for the NestJS API.

### Patch Changes

- Updated dependencies [755b293]
- Updated dependencies [7fdcefc]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
  - @flama/shared@0.3.0
