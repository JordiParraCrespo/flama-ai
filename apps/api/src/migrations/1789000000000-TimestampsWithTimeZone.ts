import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Every `timestamp` (without time zone) column left in `public` becomes
 * `timestamptz`, the type `database-design.md` requires. `up()` asks the
 * catalog what is left; `down()` converts back the columns listed below, which
 * is what the migrations before this one created.
 *
 * Which zone the stored values are in: the API wrote them through `pg`, which
 * sends a `Date` as the process's local wall time, and `now()` defaults (the
 * migrations' seed rows among them) wrote them in the database's `TimeZone`.
 * When the two zones agree, that is the zone. When they differ, a database
 * with no users holds only seed rows and is read in the database's zone; one
 * with users holds a mix no single reading gets right, so the migration stops
 * unless `TIMESTAMP_SOURCE_TIME_ZONE` names the zone to read them in (see
 * `.env.example`).
 *
 * Locking: each conversion takes an ACCESS EXCLUSIVE lock, held until the boot
 * transaction commits. Read in UTC on Postgres 12+ it is a catalog change;
 * in any other zone it rewrites the table. On a large database (a table over
 * 100k rows or 128 MB) the migration refuses the rewrite, waits at most 5
 * seconds for each lock, and leaves the `ANALYZE` the conversion calls for to
 * the operator (it logs the statement) rather than run it under those locks.
 */
const COLUMNS: Record<string, string[]> = {
  user: ['banExpires', 'createdAt', 'updatedAt'],
  session: ['expiresAt', 'createdAt', 'updatedAt'],
  account: ['accessTokenExpiresAt', 'refreshTokenExpiresAt', 'createdAt', 'updatedAt'],
  verification: ['expiresAt', 'createdAt', 'updatedAt'],
  organization: ['createdAt'],
  member: ['createdAt'],
  team: ['createdAt', 'updatedAt'],
  teamMember: ['createdAt'],
  invitation: ['expiresAt', 'createdAt'],
  oauthApplication: ['createdAt', 'updatedAt'],
  oauthAccessToken: ['accessTokenExpiresAt', 'refreshTokenExpiresAt', 'createdAt', 'updatedAt'],
  oauthConsent: ['createdAt', 'updatedAt'],
  api_token: ['expiresAt', 'lastUsedAt', 'revokedAt', 'createdAt', 'updatedAt'],
  role: ['createdAt', 'updatedAt'],
  user_role: ['createdAt'],
  access_grant: ['createdAt'],
  user_settings: ['createdAt', 'updatedAt'],
  outbox_message: ['availableAt', 'lockedUntil', 'createdAt', 'processedAt'],
  feature_flag: ['createdAt', 'updatedAt'],
  feature_flag_segment: ['createdAt', 'updatedAt'],
  feature_flag_change: ['createdAt'],
};

const UTC = ['UTC', 'Etc/UTC', 'Etc/UCT', 'UCT', 'Zulu', 'Etc/Zulu', 'GMT', 'Etc/GMT'];
const sameZone = (a: string, b: string) => a === b || (UTC.includes(a) && UTC.includes(b));

export class TimestampsWithTimeZone1789000000000 implements MigrationInterface {
  name = 'TimestampsWithTimeZone1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: { table: string; column: string }[] = await queryRunner.query(
      `SELECT table_name AS "table", column_name AS "column"
         FROM information_schema.columns
        WHERE table_schema = 'public' AND data_type = 'timestamp without time zone'
        ORDER BY table_name, ordinal_position`,
    );
    const unlisted = rows.filter(({ table, column }) => !COLUMNS[table]?.includes(column));
    if (unlisted.length > 0) {
      throw new Error(
        `TimestampsWithTimeZone: ${unlisted.map(({ table, column }) => `"${table}"."${column}"`).join(', ')} ` +
          'would be converted but not restored by down(); add them to COLUMNS.',
      );
    }
    const columns: Record<string, string[]> = {};
    for (const { table, column } of rows) {
      columns[table] = [...(columns[table] ?? []), column];
    }
    await this.convert(queryRunner, columns, 'timestamptz');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.convert(queryRunner, COLUMNS, 'timestamp');
  }

  private async convert(
    queryRunner: QueryRunner,
    columns: Record<string, string[]>,
    to: 'timestamptz' | 'timestamp',
  ) {
    const present: { table: string }[] = await queryRunner.query(
      `SELECT relname AS "table" FROM pg_class
        WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname = ANY($1)`,
      [Object.keys(columns)],
    );
    const tables = present.map(({ table }) => table);
    if (tables.length === 0) return;
    const [{ database, version }] = await queryRunner.query(
      `SELECT current_setting('TimeZone') AS database,
              current_setting('server_version_num')::int AS version`,
    );
    const [{ large }] = await queryRunner.query(
      `SELECT coalesce(bool_or(c.reltuples > 100000 OR pg_total_relation_size(c.oid) > 128 * 1024 * 1024), false) AS large
         FROM pg_class c
        WHERE c.relnamespace = 'public'::regnamespace AND c.relname = ANY($1)`,
      [tables],
    );
    const zone = await this.sourceZone(queryRunner, database, to);

    if (large && (version < 120000 || !UTC.includes(zone))) {
      throw new Error(
        `TimestampsWithTimeZone: reading the timestamps in ${zone} on Postgres ${version} would rewrite ` +
          'large tables under an exclusive lock. It is a catalog-only change on Postgres 12+ in UTC.',
      );
    }
    console.log(`TimestampsWithTimeZone: stored timestamps are read in ${zone}`);

    await queryRunner.query(`SET LOCAL lock_timeout = '5s'`);
    if (!sameZone(zone, database)) {
      await queryRunner.query(`SELECT set_config('TimeZone', $1, true)`, [zone]);
    }
    for (const table of tables) {
      const alters = columns[table]
        .map((column) => `ALTER COLUMN "${column}" TYPE ${to}`)
        .join(', ');
      await queryRunner.query(`ALTER TABLE "${table}" ${alters}`);
    }
    await queryRunner.query(`RESET TimeZone`);
    await queryRunner.query(`RESET lock_timeout`);

    // Changing a column's type discards its planner statistics.
    const analyze = `ANALYZE ${tables.map((table) => `"${table}"`).join(', ')}`;
    if (large) console.warn(`TimestampsWithTimeZone: run after this deploy: ${analyze};`);
    else await queryRunner.query(analyze);
  }

  /**
   * The zone the stored wall-clock values were written in (see the header).
   * Going back, the values are written in the API's zone, which is how `pg`
   * will read them.
   */
  private async sourceZone(
    queryRunner: QueryRunner,
    database: string,
    to: 'timestamptz' | 'timestamp',
  ): Promise<string> {
    const explicit = process.env.TIMESTAMP_SOURCE_TIME_ZONE?.trim();
    if (explicit) return explicit;
    const api = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (to === 'timestamp' || sameZone(api, database)) return api;
    const [{ users }] = await queryRunner.query(`SELECT EXISTS (SELECT 1 FROM "user") AS users`);
    if (!users) return database;
    throw new Error(
      `TimestampsWithTimeZone: the API runs in ${api} and the database in ${database}, so the stored ` +
        'timestamps were written in both zones. Set TIMESTAMP_SOURCE_TIME_ZONE to the zone to read them in ' +
        '(see .env.example), or run the API in the database zone for this deploy.',
    );
  }
}
