---
"@flama/api": minor
"@flama/api-client": minor
---

`GET /v1/access-grants` is paginated, the scope resolver's grant lookup is one
statement shape, and creating a grant answers with the grant it created.

- **Breaking response shape:** `GET /v1/access-grants` returned every grant in
  the organization as a bare array. It now takes `page` and `limit` (default
  20, at most 100) and answers `{ data, meta }` like the other paginated lists
  (`PaginatedAccessGrantsResponseDto`), newest first. An API-token script
  reading the array needs to read `data` and follow `meta.totalPages`.
- `findActiveForPrincipals` passes the principals as two arrays through
  `unnest`, so the SQL text no longer changes with how many teams and roles a
  user has (one plan-cache and `pg_stat_statements` entry), and it still reads
  through `IDX_access_grant_lookup`.
- `POST /v1/access-grants` reads the new grant back by id
  (`FindAccessGrantQuery`) instead of listing the organization's grants and
  falling back to the first when the new one was not among them.
