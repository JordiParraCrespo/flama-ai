import { randomUUID } from 'node:crypto';
import { likeContains } from '@flama/backend-core';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { DataSource } from 'typeorm';
import { loadMigrations } from './run-migrations';

/**
 * The schema the whole migration chain leaves behind, checked in the catalog:
 * the rules in `.agents/rules/database-design.md` that a later migration could
 * quietly break. `HardenAuthTables` and `TimestampsWithTimeZone` are also
 * reverted and re-applied, with rows in place, so their `down()` is proven; so
 * are `AddUserSearchTrigramIndex` and `IndexUnbackedForeignKeys`.
 */
describe('Database schema (integration)', () => {
  let pgContainer: StartedTestContainer;
  let db: DataSource;

  beforeAll(async () => {
    pgContainer = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({ POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'test', POSTGRES_DB: 'test' })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 2))
      .start();
    db = new DataSource({
      type: 'postgres',
      host: pgContainer.getHost(),
      port: pgContainer.getMappedPort(5432),
      username: 'test',
      password: 'test',
      database: 'test',
      migrations: await loadMigrations(),
    });
    await db.initialize();
    await db.runMigrations();
  }, 120000);

  afterAll(async () => {
    await db?.destroy();
    await pgContainer?.stop();
  });

  /** Every row of a catalog query, keyed by its `name` column. */
  const byName = async <Row extends { name: string }>(sql: string) =>
    new Map<string, Row>(((await db.query(sql)) as Row[]).map((row) => [row.name, row]));

  const foreignKeys = () =>
    byName<{ name: string; onDelete: string; valid: boolean }>(
      `SELECT conname AS name, confdeltype AS "onDelete", convalidated AS valid
         FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace`,
    );

  const indexes = () =>
    byName<{ name: string; valid: boolean; unique: boolean }>(
      `SELECT c.relname AS name, i.indisvalid AS valid, i.indisunique AS "unique"
         FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
        WHERE c.relnamespace = 'public'::regnamespace`,
    );

  /** Undoes migrations, newest first, until `name` is no longer applied. */
  const revertThrough = async (name: string) => {
    for (;;) {
      const [applied] = await db.query(`SELECT 1 FROM "migrations" WHERE "name" = $1`, [name]);
      if (!applied) return;
      await db.undoLastMigration();
    }
  };

  const naiveTimestamps = async (): Promise<string[]> =>
    (
      await db.query(
        `SELECT table_name || '.' || column_name AS name FROM information_schema.columns
          WHERE table_schema = 'public' AND data_type = 'timestamp without time zone'`,
      )
    ).map(({ name }: { name: string }) => name);

  const expectHardenedSchema = async () => {
    expect(await naiveTimestamps()).toEqual([]);

    const keys = await foreignKeys();
    // confdeltype: c = CASCADE, n = SET NULL.
    expect(keys.get('FK_session_user')).toMatchObject({ onDelete: 'c', valid: true });
    expect(keys.get('FK_session_impersonatedBy')).toMatchObject({ onDelete: 'c', valid: true });
    expect(keys.get('FK_session_activeOrganization')).toMatchObject({ onDelete: 'n', valid: true });
    expect(keys.get('FK_session_activeTeam')).toMatchObject({ onDelete: 'n', valid: true });
    expect(keys.get('FK_account_user')).toMatchObject({ onDelete: 'c', valid: true });

    const index = await indexes();
    for (const name of [
      'PK_user',
      'UQ_user_email',
      'PK_session',
      'UQ_session_token',
      'IDX_session_userId',
      'IDX_session_impersonatedBy',
      'IDX_session_activeOrganizationId',
      'IDX_session_activeTeamId',
      'PK_account',
      'IDX_account_userId',
      'UQ_account_providerId_accountId',
      'PK_verification',
      'IDX_verification_identifier_createdAt',
      'IDX_verification_expiresAt',
    ]) {
      expect(index.get(name), name).toMatchObject({ valid: true });
    }
    expect(index.get('UQ_account_providerId_accountId')?.unique).toBe(true);
  };

  it('leaves no timestamp without a time zone, and the auth tables keyed and indexed', async () => {
    await expectHardenedSchema();
  });

  describe('the auth keys at work', () => {
    const ids = {
      user: randomUUID(),
      admin: randomUUID(),
      organization: randomUUID(),
      team: randomUUID(),
      session: randomUUID(),
      impersonation: randomUUID(),
    };

    beforeAll(async () => {
      await db.query(
        `INSERT INTO "user" ("id", "name", "email", "firstName", "lastName") VALUES
           ($1, 'Ada', 'ada@example.com', 'Ada', 'L'), ($2, 'Root', 'root@example.com', 'Root', 'R')`,
        [ids.user, ids.admin],
      );
      await db.query(
        `INSERT INTO "organization" ("id", "name", "slug") VALUES ($1, 'Acme', 'acme')`,
        [ids.organization],
      );
      await db.query(
        `INSERT INTO "team" ("id", "name", "organizationId") VALUES ($1, 'General', $2)`,
        [ids.team, ids.organization],
      );
      await db.query(
        `INSERT INTO "session" ("id", "userId", "token", "expiresAt", "activeOrganizationId", "activeTeamId")
         VALUES ($1, $2, 'device', now() + interval '1 day', $3, $4)`,
        [ids.session, ids.user, ids.organization, ids.team],
      );
      await db.query(
        `INSERT INTO "session" ("id", "userId", "token", "expiresAt", "impersonatedBy")
         VALUES ($1, $2, 'impersonation', now() + interval '1 hour', $3)`,
        [ids.impersonation, ids.user, ids.admin],
      );
      await db.query(
        `INSERT INTO "account" ("id", "userId", "accountId", "providerId")
         VALUES ($1, $2, 'provider-account-1', 'example')`,
        [randomUUID(), ids.user],
      );
    });

    it('refuses a second account for the same provider account', async () => {
      await expect(
        db.query(
          `INSERT INTO "account" ("id", "userId", "accountId", "providerId")
           VALUES ($1, $2, 'provider-account-1', 'example')`,
          [randomUUID(), ids.admin],
        ),
      ).rejects.toThrow(/UQ_account_providerId_accountId/);
    });

    it('refuses a session for a user that does not exist', async () => {
      await expect(
        db.query(
          `INSERT INTO "session" ("id", "userId", "token", "expiresAt")
           VALUES ($1, $2, 'ghost', now())`,
          [randomUUID(), randomUUID()],
        ),
      ).rejects.toThrow(/FK_session_user/);
    });

    it('keeps the session when its workspace goes, and ends an impersonation with its admin', async () => {
      await db.query(`DELETE FROM "organization" WHERE "id" = $1`, [ids.organization]);
      const [device] = await db.query(
        `SELECT "activeOrganizationId", "activeTeamId" FROM "session" WHERE "id" = $1`,
        [ids.session],
      );
      expect(device).toEqual({ activeOrganizationId: null, activeTeamId: null });

      await db.query(`DELETE FROM "user" WHERE "id" = $1`, [ids.admin]);
      expect(
        await db.query(`SELECT 1 FROM "session" WHERE "id" = $1`, [ids.impersonation]),
      ).toEqual([]);
    });

    it("deletes a user's sessions and accounts with the user", async () => {
      await db.query(`DELETE FROM "user" WHERE "id" = $1`, [ids.user]);
      const [{ sessions, accounts }] = await db.query(
        `SELECT (SELECT count(*)::int FROM "session" WHERE "userId" = $1) AS sessions,
                (SELECT count(*)::int FROM "account" WHERE "userId" = $1) AS accounts`,
        [ids.user],
      );
      expect({ sessions, accounts }).toEqual({ sessions: 0, accounts: 0 });
    });
  });

  describe('AddUserSearchTrigramIndex and IndexUnbackedForeignKeys', () => {
    const TRIGRAM = 'AddUserSearchTrigramIndex1789100000000';
    const FK_INDEXES = 'IndexUnbackedForeignKeys1789200000000';

    /** Every index the two migrations create, with what `pg_get_indexdef` ends with. */
    const EXPECTED: [string, RegExp][] = [
      [
        'IDX_user_search_trgm',
        /USING gin \("firstName" gin_trgm_ops, "lastName" gin_trgm_ops, email gin_trgm_ops\)$/,
      ],
      [
        'IDX_user_role_organization',
        /USING btree \("organizationId"\) WHERE \("organizationId" IS NOT NULL\)$/,
      ],
      ['IDX_user_role_role', /USING btree \("roleId"\)$/],
    ];
    const ALL = EXPECTED.map(([name]) => name);

    const expectIndexes = async (present: string[]) => {
      const index = await indexes();
      const definitions = await db.query(
        `SELECT c.relname AS name, pg_get_indexdef(i.indexrelid) AS definition
           FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
          WHERE c.relnamespace = 'public'::regnamespace`,
      );
      const definition = new Map<string, string>(
        definitions.map((row: { name: string; definition: string }) => [row.name, row.definition]),
      );
      for (const [name, pattern] of EXPECTED) {
        if (present.includes(name)) {
          expect(index.get(name), name).toMatchObject({ valid: true });
          expect(definition.get(name), name).toMatch(pattern);
        } else {
          expect(index.has(name), name).toBe(false);
        }
      }
    };

    /** The admin search as `UserRepository.findUsers` issues it. */
    const search = (term: string) =>
      db.query(
        `SELECT "email" FROM "user"
          WHERE "firstName" ILIKE $1 OR "lastName" ILIKE $1 OR "email" ILIKE $1
          ORDER BY "email"`,
        [likeContains(term)],
      );

    beforeAll(async () => {
      await db.query(
        `INSERT INTO "user" ("id", "name", "email", "firstName", "lastName")
         VALUES ($1, 'Axb', 'axb@search.test', 'Axb', 'Plain'),
                ($2, 'A_b', 'a_b@search.test', 'A_b', 'Underscore'),
                ($3, 'Pct', 'pct@search.test', 'Fifty%', 'Percent')`,
        [randomUUID(), randomUUID(), randomUUID()],
      );
    });

    it('builds the user search index and backs the two user_role foreign keys', async () => {
      await expectIndexes(ALL);
    });

    it('matches `_` and `%` literally, and serves the search from the trigram index', async () => {
      expect(await search('a_b')).toEqual([{ email: 'a_b@search.test' }]);
      expect(await search('%')).toEqual([{ email: 'pct@search.test' }]);
      expect(await search('axb')).toEqual([{ email: 'axb@search.test' }]);

      // The planner prefers a sequential scan on a table this small; with it
      // off, the plan shows the one index serving all three conditions.
      const plan: { 'QUERY PLAN': string }[] = await db.transaction(async (manager) => {
        await manager.query('SET LOCAL enable_seqscan = off');
        return manager.query(
          `EXPLAIN SELECT "email" FROM "user"
            WHERE "firstName" ILIKE $1 OR "lastName" ILIKE $1 OR "email" ILIKE $1`,
          [likeContains('ada')],
        );
      });
      const text = plan.map((row) => row['QUERY PLAN']).join('\n');
      expect(text).toContain('BitmapOr');
      expect(text.match(/Bitmap Index Scan on "IDX_user_search_trgm"/g)).toHaveLength(3);
    });

    it('reverts and re-applies both over the same rows', async () => {
      await revertThrough(FK_INDEXES);
      await expectIndexes(['IDX_user_search_trgm']);
      await revertThrough(TRIGRAM);
      await expectIndexes([]);
      expect(await search('a_b')).toEqual([{ email: 'a_b@search.test' }]);

      await db.runMigrations();
      await expectIndexes(ALL);
    });
  });

  describe('reverting and re-applying', () => {
    const userId = randomUUID();

    afterEach(() => {
      delete process.env.TZ;
      delete process.env.TIMESTAMP_SOURCE_TIME_ZONE;
    });

    it('restores the original schema, and keeps every instant across the round trip', async () => {
      await revertThrough('TimestampsWithTimeZone1789000000000');
      await revertThrough('HardenAuthTables1788900000000');

      expect(await naiveTimestamps()).toContain('session.expiresAt');
      expect((await foreignKeys()).has('FK_session_user')).toBe(false);
      expect((await indexes()).has('PK_session')).toBe(false);
      expect((await indexes()).has('PK_f55da76ac1c3ac420f444d2ff11')).toBe(true);

      // A row as the API wrote it before the conversion: UTC wall time.
      await db.query(
        `INSERT INTO "user" ("id", "name", "email", "firstName", "lastName", "createdAt")
         VALUES ($1, 'Bea', 'bea@example.com', 'Bea', 'B', '2026-01-15 12:00:00')`,
        [userId],
      );

      await db.runMigrations();
      await expectHardenedSchema();
      const [{ same }] = await db.query(
        `SELECT "createdAt" = timestamptz '2026-01-15 12:00:00+00' AS same FROM "user" WHERE "id" = $1`,
        [userId],
      );
      expect(same).toBe(true);
    });

    it('refuses to guess the zone when the API and the database disagree', async () => {
      await revertThrough('TimestampsWithTimeZone1789000000000');
      process.env.TZ = 'Europe/Madrid';
      await expect(db.runMigrations()).rejects.toThrow(/TIMESTAMP_SOURCE_TIME_ZONE/);
      expect(await naiveTimestamps()).toContain('user.createdAt');

      // Told the zone, it reads every value in it.
      process.env.TIMESTAMP_SOURCE_TIME_ZONE = 'Europe/Madrid';
      await db.runMigrations();
      const [{ same }] = await db.query(
        `SELECT "createdAt" = timestamptz '2026-01-15 11:00:00+00' AS same FROM "user" WHERE "id" = $1`,
        [userId],
      );
      expect(same).toBe(true);
    });
  });
});
