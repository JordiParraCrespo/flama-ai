import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives Better Auth's `session` and `account` tables the foreign keys and
 * indexes they were created without, and the first migration's constraints
 * readable names.
 *
 * `session."userId"` and `account."userId"` had neither a foreign key nor an
 * index. Every "this user's sessions / accounts" read (the profile's active
 * sessions, revoking sessions, the delegated-session remint, password and
 * social sign-in, account linking) scanned the whole table. And
 * `DeleteUserCommandHandler` deletes the `user` row directly, so a deleted
 * user's sessions and login credentials (password hash, OAuth tokens) stayed
 * behind. Both foreign keys are `ON DELETE CASCADE`: a session or a login
 * means nothing without its user, which is also Better Auth's own schema.
 *
 * Also indexed, because Better Auth looks rows up by them on every sign-in:
 * `verification."identifier"` (email verification, password reset, magic
 * links) and `account ("providerId", "accountId")` (social sign-in). The
 * account one is not unique: an existing database may hold duplicates, and
 * Better Auth does not rely on uniqueness there.
 *
 * Access patterns and the index serving each:
 *   Q1 session by token (every request)         → UQ_session_token
 *   Q2 a user's sessions; cascade on user delete → IDX_session_userId
 *   Q3 a user's accounts; cascade on user delete → IDX_account_userId
 *   Q4 account by provider + provider's id        → IDX_account_providerId_accountId
 *   Q5 verification rows by identifier            → IDX_verification_identifier
 * A user's sessions are few, so ordering them (newest first) sorts a handful
 * of rows; `"updatedAt"` stays out of the index because Better Auth rewrites it
 * on every session refresh, and indexing it would cost every refresh a write
 * to that index.
 *
 * Renames: the constraints `InitAuthSchema` left with TypeORM's hashed names
 * become `PK_user`, `UQ_user_email`, `PK_session`, `UQ_session_token`,
 * `PK_account`, `PK_verification`. A rename changes only the catalog.
 *
 * ---------------------------------------------------------------------------
 * Large databases (a table over 100k rows or 128 MB): run this first.
 *
 * Boot migrations share one transaction, and every lock is held until it
 * commits. Building an index or validating a foreign key on a busy 20M-row
 * `session` inside it would block sign-ins for the whole deploy. So on a large
 * table this migration only checks that the slow work is done, and fails the
 * deploy with a pointer here if it is not. Run, with psql in autocommit mode,
 * `apps/api/db/ops/1788700000000-harden-auth-tables.sql` (every step can be
 * re-run). It builds the indexes `CONCURRENTLY`, adds the foreign keys
 * `NOT VALID`, deletes orphaned rows in batches and validates the keys, none
 * of which blocks reads or writes for more than a moment. On small databases
 * (development, CI, fresh installs) the migration does all of it itself.
 * ---------------------------------------------------------------------------
 */
export class HardenAuthTables1788700000000 implements MigrationInterface {
  name = 'HardenAuthTables1788700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET LOCAL lock_timeout = '5s'`);

    await this.renameConstraint(queryRunner, 'user', 'PK_cace4a159ff9f2512dd42373760', 'PK_user');
    await this.renameConstraint(
      queryRunner,
      'user',
      'UQ_e12875dfb3b1d92d7d7c5377e22',
      'UQ_user_email',
    );
    await this.renameConstraint(
      queryRunner,
      'session',
      'PK_f55da76ac1c3ac420f444d2ff11',
      'PK_session',
    );
    await this.renameConstraint(
      queryRunner,
      'session',
      'UQ_232f8e85d7633bd6ddfad421696',
      'UQ_session_token',
    );
    await this.renameConstraint(
      queryRunner,
      'account',
      'PK_54115ee388cdb6d86bb4bf5b2ea',
      'PK_account',
    );
    await this.renameConstraint(
      queryRunner,
      'verification',
      'PK_f7e3a90ca384e71d6e2e93bb340',
      'PK_verification',
    );

    // Q2, Q3, Q4, Q5.
    await this.ensureIndex(queryRunner, 'session', 'IDX_session_userId', `("userId")`);
    await this.ensureIndex(queryRunner, 'account', 'IDX_account_userId', `("userId")`);
    await this.ensureIndex(
      queryRunner,
      'account',
      'IDX_account_providerId_accountId',
      `("providerId", "accountId")`,
    );
    await this.ensureIndex(
      queryRunner,
      'verification',
      'IDX_verification_identifier',
      `("identifier")`,
    );

    await this.ensureUserForeignKey(queryRunner, 'session', 'FK_session_user');
    await this.ensureUserForeignKey(queryRunner, 'account', 'FK_account_user');

    await queryRunner.query(`RESET lock_timeout`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET LOCAL lock_timeout = '5s'`);
    await queryRunner.query(`ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "FK_account_user"`);
    await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "FK_session_user"`);
    // On a large database, drop these first with DROP INDEX CONCURRENTLY
    // (the ops script's rollback section); IF EXISTS then skips them.
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_verification_identifier"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_account_providerId_accountId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_account_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_session_userId"`);
    await this.renameConstraint(
      queryRunner,
      'verification',
      'PK_verification',
      'PK_f7e3a90ca384e71d6e2e93bb340',
    );
    await this.renameConstraint(
      queryRunner,
      'account',
      'PK_account',
      'PK_54115ee388cdb6d86bb4bf5b2ea',
    );
    await this.renameConstraint(
      queryRunner,
      'session',
      'UQ_session_token',
      'UQ_232f8e85d7633bd6ddfad421696',
    );
    await this.renameConstraint(
      queryRunner,
      'session',
      'PK_session',
      'PK_f55da76ac1c3ac420f444d2ff11',
    );
    await this.renameConstraint(
      queryRunner,
      'user',
      'UQ_user_email',
      'UQ_e12875dfb3b1d92d7d7c5377e22',
    );
    await this.renameConstraint(queryRunner, 'user', 'PK_user', 'PK_cace4a159ff9f2512dd42373760');
    await queryRunner.query(`RESET lock_timeout`);
  }

  /** Renames a constraint if it still has its old name (safe to re-run). */
  private async renameConstraint(
    queryRunner: QueryRunner,
    table: string,
    from: string,
    to: string,
  ) {
    const [row] = await queryRunner.query(
      `SELECT 1 FROM pg_constraint WHERE conrelid = $1::regclass AND conname = $2`,
      [`"${table}"`, from],
    );
    if (row)
      await queryRunner.query(`ALTER TABLE "${table}" RENAME CONSTRAINT "${from}" TO "${to}"`);
  }

  /** True when a table is too big to build an index or scan it inside the boot transaction. */
  private async isLarge(queryRunner: QueryRunner, table: string): Promise<boolean> {
    const [row] = await queryRunner.query(
      `SELECT c.reltuples > 100000 OR pg_total_relation_size(c.oid) > 128 * 1024 * 1024 AS large
         FROM pg_class c WHERE c.oid = $1::regclass`,
      [`"${table}"`],
    );
    return row.large === true;
  }

  private async ensureIndex(
    queryRunner: QueryRunner,
    table: string,
    name: string,
    columns: string,
  ) {
    const [existing] = await queryRunner.query(
      `SELECT i.indisvalid AS valid
         FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
        WHERE c.relname = $1 AND c.relnamespace = 'public'::regnamespace`,
      [name],
    );
    if (existing?.valid) return;
    if (await this.isLarge(queryRunner, table)) {
      throw new Error(
        `${name} is ${existing ? 'invalid (an interrupted concurrent build)' : 'missing'} and "${table}" is too large to index at boot. ` +
          'Run apps/api/db/ops/1788700000000-harden-auth-tables.sql first (see this migration header).',
      );
    }
    if (existing) await queryRunner.query(`DROP INDEX "${name}"`);
    await queryRunner.query(`CREATE INDEX "${name}" ON "${table}" ${columns}`);
  }

  private async ensureUserForeignKey(queryRunner: QueryRunner, table: string, name: string) {
    const [existing] = await queryRunner.query(
      `SELECT convalidated FROM pg_constraint WHERE conrelid = $1::regclass AND conname = $2`,
      [`"${table}"`, name],
    );
    if (existing?.convalidated) return;
    if (await this.isLarge(queryRunner, table)) {
      throw new Error(
        `${name} is ${existing ? 'not validated' : 'missing'} and "${table}" is too large to check at boot. ` +
          'Run apps/api/db/ops/1788700000000-harden-auth-tables.sql first (see this migration header).',
      );
    }
    if (!existing) {
      // NOT VALID first: from here on no new orphan can be written.
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${name}"
           FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE NOT VALID`,
      );
    }
    // Rows whose user was deleted directly can never be used again.
    await queryRunner.query(
      `DELETE FROM "${table}" t WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."id" = t."userId")`,
    );
    await queryRunner.query(`ALTER TABLE "${table}" VALIDATE CONSTRAINT "${name}"`);
  }
}
