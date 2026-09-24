-- One-off, before deploying migration 1788700000000-HardenAuthTables on a
-- large database (a session/account/verification table over 100k rows or
-- 128 MB). Small databases do not need it: the migration does the same work
-- itself.
--
-- Run it with psql in autocommit mode (the default; no -1, no BEGIN), for
-- example:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/db/ops/1788700000000-harden-auth-tables.sql
--
-- Every step can be run again. Nothing here blocks reads or writes for more
-- than a moment: the index builds are CONCURRENTLY, the foreign keys are added
-- NOT VALID (a catalog change) under a 3-second lock_timeout, and VALIDATE
-- CONSTRAINT only takes a SHARE UPDATE EXCLUSIVE lock. If a lock times out,
-- run the script again.

\set ON_ERROR_STOP 1
SET lock_timeout = '3s';
SET statement_timeout = 0;

-- 1. What you are about to change. Stop here if the orphan counts look wrong:
--    step 4 deletes those rows.
SELECT current_setting('server_version') AS postgres,
       current_setting('TimeZone') AS database_time_zone;
SELECT 'session' AS "table", count(*) AS orphans
  FROM "session" s WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."id" = s."userId")
UNION ALL
SELECT 'account', count(*)
  FROM "account" a WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."id" = a."userId");

-- 2. Indexes, built without blocking writes. An interrupted concurrent build
--    leaves an INVALID index behind; drop it so the build can be retried.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
            WHERE NOT i.indisvalid AND c.relname IN
              ('IDX_session_userId', 'IDX_account_userId',
               'IDX_account_providerId_accountId', 'IDX_verification_identifier')
  LOOP
    RAISE NOTICE 'dropping invalid index %', r.relname;
    EXECUTE format('DROP INDEX %I', r.relname);  -- plain DROP: invalid indexes are not used
  END LOOP;
END $$;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_session_userId" ON "session" ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_account_userId" ON "account" ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_account_providerId_accountId" ON "account" ("providerId", "accountId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_verification_identifier" ON "verification" ("identifier");

-- 3. Foreign keys, NOT VALID: a catalog change; new rows are checked from now on.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_session_user') THEN
    ALTER TABLE "session" ADD CONSTRAINT "FK_session_user"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_account_user') THEN
    ALTER TABLE "account" ADD CONSTRAINT "FK_account_user"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

-- 4. Delete orphaned rows in batches of 5,000, each committed on its own and
--    deleted by ctid, so a batch locks only its own rows. Finding a batch
--    reads the table and probes "user" by primary key; orphans are normally
--    few, so this is one or two passes.
DO $$
DECLARE n integer;
BEGIN
  LOOP
    DELETE FROM "session" WHERE ctid = ANY (ARRAY(
      SELECT s.ctid FROM "session" s
       WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."id" = s."userId") LIMIT 5000));
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'session orphans deleted: %', n;
    EXIT WHEN n = 0;
    COMMIT;
  END LOOP;
  LOOP
    DELETE FROM "account" WHERE ctid = ANY (ARRAY(
      SELECT a.ctid FROM "account" a
       WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."id" = a."userId") LIMIT 5000));
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'account orphans deleted: %', n;
    EXIT WHEN n = 0;
    COMMIT;
  END LOOP;
END $$;

-- 5. Check the existing rows against the keys. Reads and writes carry on.
ALTER TABLE "session" VALIDATE CONSTRAINT "FK_session_user";
ALTER TABLE "account" VALIDATE CONSTRAINT "FK_account_user";

-- 6. Fresh statistics for the planner.
ANALYZE "session";
ANALYZE "account";
ANALYZE "verification";

-- Rolling back migration 1788700000000 on a large database: first run
--   DROP INDEX CONCURRENTLY IF EXISTS "IDX_session_userId";
--   DROP INDEX CONCURRENTLY IF EXISTS "IDX_account_userId";
--   DROP INDEX CONCURRENTLY IF EXISTS "IDX_account_providerId_accountId";
--   DROP INDEX CONCURRENTLY IF EXISTS "IDX_verification_identifier";
-- then revert the migration; its down() skips the indexes that are gone.
