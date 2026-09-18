# @flama/frontend-consumer

## 0.3.0

### Minor Changes

- af46e89: Bring every user-facing error into the RFC 7807 catalog.

  The organization and admin façades threw bare `HttpException`s carrying Better
  Auth's `{ message, code }` body, expecting the code to survive. It did not:
  `AllExceptionsFilter` reads a `code` from `AppError` alone, so ~46 call sites
  answered with a codeless problem document whose `title` was only the status
  phrase ("Conflict"). The auth guards had the same gap.

  - **`@flama/backend-core`** — new `ApiAuthProblemResponses()` documents the
    401/403 every guarded route can produce, applied once per controller class.
    A test now pins the deliberate rule that a bare `HttpException` carries no
    `code`.
  - **`apps/api`** — new `AuthErrors` (`AUTH_001`/`AUTH_002`), `OrganizationErrors`
    (`ORG_001`–`ORG_016`) and `AdminErrors` (`ADMIN_001`–`ADMIN_008`) catalogs.
    `betterAuthInvoker` folds Better Auth's ~85 upstream codes onto them, keeping
    the original as an `upstreamCode` extension member. Guards throw catalog
    errors instead of Nest's codeless ones; `PoliciesGuard` now reports a missing
    principal as 401 rather than 403.
  - **`@flama/translations`** — new `errors` namespace with a message per code in
    both locales, so clients stop rendering the server's English `detail`.
  - **`@flama/frontend-core`** — new `createErrorMessageResolver` translating a
    failure from its problem `code`.
  - **`@flama/frontend-consumer`** — the organizations repository no longer
    swallows a failed read into an empty list.
  - **`@flama/api-client`** — regenerated; the documented failures now reach the
    OpenAPI document.

- e6895ae: Describe scope and permission-catalog responses properly in OpenAPI, so the
  generated client carries their real types.

  Several response DTOs described themselves loosely enough that the generated
  client lost the type and every consumer had to cast it back:

  - Scope arrays (`ApiTokenResponseDto.scopes`, `PermissionCatalogResponseDto.grantable`,
    `CurrentCredentialResponseDto.grantedScopes` / `effectiveScopes`) were declared
    `type: [String]` and generated as `string[]`. They now declare `enum: SCOPES`,
    so the client sees the same 20-member union the request DTO already used.
  - `PermissionCatalogResponseDto.groups` was an untyped object array and generated
    as `Record<string, any>[]`. The catalog now has real DTOs — `PermissionGroupDto`,
    `ScopeLevelsDto`, `ScopeLevelDto`, `ScopePolicyDto` — mirroring `PermissionGroup`
    from `@flama/shared`, so drift between the two becomes a compile error.
  - `GET /v1/users` declared no response schema at all and generated as `any`, taking
    the whole paginated list with it. It now returns `PaginatedUsersResponseDto`
    (with `PaginationMetaDto`).

  The wire format is unchanged — only its description. `@flama/frontend-consumer`'s
  api-tokens repository drops the casts this forced (including a `dto as never`
  that was disabling type checking on the create-token request body) and reads
  the generated DTOs directly. In `@flama/frontend-core`,
  `UsersRepository.findAll` / `UsersService.findAll` widen their `role` filter
  from `'admin' | 'user'` to `Role`, matching the database-backed roles the API
  actually accepts.

  The root `generate:openapi` script ran `nest build` from the repo root, where
  there is no Nest workspace, so `pnpm generate:api-client` always failed; it now
  delegates to `@flama/api`.

### Patch Changes

- Updated dependencies [23e7181]
- Updated dependencies [755b293]
- Updated dependencies [7fdcefc]
- Updated dependencies [af46e89]
- Updated dependencies [c27a7f4]
- Updated dependencies [510fb79]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
- Updated dependencies [d532ef4]
- Updated dependencies [d06200f]
- Updated dependencies [e6895ae]
- Updated dependencies [48d1b41]
  - @flama/frontend-core@0.3.0
  - @flama/shared@1.0.0
  - @flama/api-client@1.0.0
