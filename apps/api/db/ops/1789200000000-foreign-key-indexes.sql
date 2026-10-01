-- One-off, before deploying migration 1789200000000-IndexUnbackedForeignKeys
-- on a large database (a user_role table over 100k rows or 128 MB). Small
-- databases do not need it: the migration builds the same indexes itself. To
-- undo it, 1789200000000-foreign-key-indexes.rollback.sql.
--
-- Run it with psql in autocommit mode (the default; no -1, no BEGIN):
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/api/db/ops/1789200000000-foreign-key-indexes.sql
--
-- Every step can be run again. The builds are CONCURRENTLY, so reads and
-- writes carry on while they run, however long that takes.

\set ON_ERROR_STOP 1
SET statement_timeout = 0;
SET lock_timeout = 0;

-- 1. An interrupted concurrent build leaves an INVALID index behind; drop it
--    so the build can be retried.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
            WHERE NOT i.indisvalid AND c.relnamespace = 'public'::regnamespace AND c.relname IN
              ('IDX_user_role_organization', 'IDX_user_role_role')
  LOOP
    RAISE NOTICE 'dropping invalid index %', r.relname;
    EXECUTE format('DROP INDEX %I', r.relname);  -- plain DROP: invalid indexes are not used
  END LOOP;
END $$;

-- 2. The indexes, built without blocking writes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_user_role_organization" ON "user_role" USING btree ("organizationId") WHERE "organizationId" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_user_role_role" ON "user_role" USING btree ("roleId");

-- 3. Fresh statistics for the planner.
ANALYZE "user_role";
