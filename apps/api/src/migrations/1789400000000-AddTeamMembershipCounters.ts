import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The two columns Better Auth 1.7's organization plugin adds to its team
 * tables. It checks its schema at boot and refuses to start without them.
 *
 * `team."memberCount"` is the plugin's seat counter: adding someone to a team
 * reserves a seat by incrementing it under the team's member limit, and
 * removing them decrements it. `NOT NULL DEFAULT 0` is a catalog-only change
 * on Postgres 11+. The plugin only ever corrects the counter upwards (it
 * recounts before an add), so existing teams are backfilled to their real
 * size here rather than starting at zero. `team` holds workspaces, a handful
 * per organization, so one `UPDATE` is the right size for a boot migration.
 *
 * `teamMember."membershipKey"` is a digest of `(teamId, userId)` that the
 * plugin writes on every new membership. Its unique index is what stops two
 * concurrent adds of the same person from both landing. It is nullable and
 * left empty on existing rows: the plugin looks a membership up by key and
 * then by the pair, so an old row is still found, and the unique index
 * ignores NULLs.
 *
 * The index is `CREATE UNIQUE INDEX IF NOT EXISTS`, a `SHARE` lock (reads
 * continue, writes to `teamMember` wait) held until the boot transaction
 * commits. On a large `teamMember`, build it by hand first, in autocommit:
 * `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "UQ_teamMember_membershipKey"
 * ON "teamMember" ("membershipKey");` and this migration finds it in place.
 *
 * Both are Better Auth's own fields, declared by the plugin, so neither needs
 * an `additionalField`.
 */
export class AddTeamMembershipCounters1789400000000 implements MigrationInterface {
  name = 'AddTeamMembershipCounters1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET LOCAL lock_timeout = '5s'`);
    await queryRunner.query(
      `ALTER TABLE "team" ADD COLUMN IF NOT EXISTS "memberCount" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE "team" t SET "memberCount" = c.n
         FROM (SELECT "teamId", count(*)::integer AS n FROM "teamMember" GROUP BY "teamId") c
        WHERE c."teamId" = t."id" AND t."memberCount" <> c.n`,
    );
    await queryRunner.query(
      `ALTER TABLE "teamMember" ADD COLUMN IF NOT EXISTS "membershipKey" text`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_teamMember_membershipKey" ON "teamMember" ("membershipKey")`,
    );
    await queryRunner.query(`RESET lock_timeout`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_teamMember_membershipKey"`);
    await queryRunner.query(`ALTER TABLE "teamMember" DROP COLUMN IF EXISTS "membershipKey"`);
    await queryRunner.query(`ALTER TABLE "team" DROP COLUMN IF EXISTS "memberCount"`);
  }
}
