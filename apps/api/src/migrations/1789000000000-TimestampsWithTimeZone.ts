import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Every remaining `timestamp` (without time zone) column becomes `timestamptz`.
 *
 * A `timestamp` column stores a wall-clock reading with no zone: the same row
 * means a different instant to a reader in another time zone, and comparing
 * it with `now()` (a `timestamptz`) converts through the session's zone
 * silently. Every table created since `AddAccessGrants` uses `timestamptz`;
 * this brings the 48 older columns in line (the list is `COLUMNS` below).
 *
 * How the existing values are read: `now()` defaults wrote them in the
 * database's `TimeZone`, and the API (through `pg`) in its process zone.
 * Docker Postgres and Node containers both default to UTC, and local
 * development usually runs both in the machine's zone, so the stored values
 * are read in the database's `TimeZone`. The migration logs which zone that
 * is.
 *
 * Locking: changing a column's type takes an ACCESS EXCLUSIVE lock, held
 * until the boot transaction commits. On Postgres 12+ with the session zone
 * set to UTC, `timestamp` → `timestamptz` is a catalog change: no table
 * rewrite, no index rebuild, milliseconds per table. With any other zone it
 * rewrites every table under that lock. So:
 *   - on a large database (any of these tables over 100k rows or 128 MB) the
 *     migration refuses to run unless the server is 12+ and the database's
 *     zone is UTC, and says why;
 *   - it waits at most 5 seconds for each lock, so a long transaction on a
 *     hot table fails the deploy instead of queueing requests behind it;
 *   - it runs after every other pending migration (the newest timestamp), so
 *     nothing slow keeps its locks open. On a large database, deploy it on
 *     its own.
 *
 * Better Auth reads and writes these columns as JS `Date`s through `pg`, which
 * handles both types the same way; nothing in its configuration changes.
 * `down()` converts back, reading the instants in the same zone.
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

export class TimestampsWithTimeZone1789000000000 implements MigrationInterface {
  name = 'TimestampsWithTimeZone1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.convert(queryRunner, 'timestamptz');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.convert(queryRunner, 'timestamp');
  }

  private async convert(queryRunner: QueryRunner, to: 'timestamptz' | 'timestamp') {
    const [{ zone, version }] = await queryRunner.query(
      `SELECT current_setting('TimeZone') AS zone,
              current_setting('server_version_num')::int AS version`,
    );
    const [{ large }] = await queryRunner.query(
      `SELECT coalesce(bool_or(c.reltuples > 100000 OR pg_total_relation_size(c.oid) > 128 * 1024 * 1024), false) AS large
         FROM pg_class c
        WHERE c.relnamespace = 'public'::regnamespace AND c.relname = ANY($1)`,
      [Object.keys(COLUMNS)],
    );
    const utc = ['UTC', 'Etc/UTC', 'Etc/UCT', 'UCT', 'Zulu', 'Etc/Zulu', 'GMT', 'Etc/GMT'].includes(
      zone,
    );
    if (large && (version < 120000 || !utc)) {
      throw new Error(
        `Converting timestamps on this database would rewrite large tables under an exclusive lock ` +
          `(Postgres ${version}, TimeZone ${zone}). It is a catalog-only change on Postgres 12+ ` +
          `with the database's TimeZone set to UTC; see this migration's header.`,
      );
    }
    console.log(`TimestampsWithTimeZone: reading stored timestamps in ${zone}`);

    await queryRunner.query(`SET LOCAL lock_timeout = '5s'`);
    for (const [table, columns] of Object.entries(COLUMNS)) {
      const alters = columns.map((column) => `ALTER COLUMN "${column}" TYPE ${to}`).join(', ');
      await queryRunner.query(`ALTER TABLE "${table}" ${alters}`);
    }
    await queryRunner.query(`RESET lock_timeout`);
  }
}
