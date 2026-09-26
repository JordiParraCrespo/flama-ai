---
"@flama/api": minor
---

Foreign keys, indexes and a unique provider-account key on Better Auth's `session`, `account` and `verification` tables, and `timestamptz` for every timestamp column; large databases run `apps/api/db/ops/1788900000000-harden-auth-tables.sql` first.
