---
"@flama/frontend-core": patch
---

Narrow the caller's effective permissions instead of casting them:
`GET /users/me/permissions` serves free-form CASL rules, and
`UsersRepository.myPermissions` now keeps the ones that carry an `action` and a
`subject`.
