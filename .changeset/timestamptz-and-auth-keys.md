---
"@flama/api": minor
"@flama/backend-ddd": patch
---

Close the schema gaps the first migrations left:

- `session."userId"` and `account."userId"` get indexes and `ON DELETE CASCADE`
  foreign keys to `user`. Deleting a user through the API no longer leaves
  their sessions and login credentials behind; existing orphans are deleted.
- `verification."identifier"` and `account ("providerId", "accountId")` are
  indexed for sign-in lookups.
- Every remaining `timestamp` column becomes `timestamptz`; entities and the
  outbox schema declare `timestamptz`.
- The init migration's hashed constraint names become `PK_user`,
  `UQ_user_email`, `PK_session`, `UQ_session_token`, `PK_account`,
  `PK_verification`.

Large databases run `apps/api/db/ops/1788900000000-harden-auth-tables.sql`
before deploying; the migration refuses to lock a large table and says so.
