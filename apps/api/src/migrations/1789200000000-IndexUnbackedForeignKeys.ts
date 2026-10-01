import type { MigrationInterface, QueryRunner } from 'typeorm';
import { dropIndexes, ensureIndexes, type IndexSpec } from './helpers/index-migration';

/**
 * Backs the two foreign keys on `user_role` that had no index at all
 * (`.agents/rules/database-design.md`: every foreign key is backed by an index
 * whose leading columns are the key's). Without one, a delete of the parent
 * scans the child table under lock, and so does every "children of X" query.
 *
 * Access patterns and what serves each:
 *   Q1 an `organization` delete's cascade into `user_role`
 *      (FK_user_role_organization)             → IDX_user_role_organization
 *   Q2 a `role` delete's cascade into `user_role` (FK_user_role_role), and
 *      the lookup of a role's holders (`WHERE "roleId" = $1`) on every edit or
 *      delete of an organization's role        → IDX_user_role_role
 *
 * Q1 is partial on `IS NOT NULL`: every lookup the key makes names a parent,
 * so the NULL rows (a global assignment) would only make the index bigger.
 *
 * IDX_user_role_user_org ("userId", "organizationId") and the two UQ_user_role_*
 * lead with `userId`, so none of them serves Q1 or Q2.
 *
 * The ORM entity declares each index under the same name, with `where:` for
 * the partial one.
 *
 * `down()` drops both.
 *
 * ---------------------------------------------------------------------------
 * Large databases (`user_role` over 100k rows or 128 MB): run the ops script.
 *
 * Boot migrations share one transaction and hold every lock until it commits.
 * `CREATE INDEX` blocks writes to its table and `DROP INDEX` blocks reads too,
 * for the whole deploy. `user_role` grows with users times workspaces, and
 * blocking it blocks sign-up (which writes the owner's role). So on a large
 * table this migration only checks that the work is done, and fails with a
 * pointer here if it is not. Before deploying, run with psql in autocommit
 * mode `apps/api/db/ops/1789200000000-foreign-key-indexes.sql`; before
 * reverting, `apps/api/db/ops/1789200000000-foreign-key-indexes.rollback.sql`.
 * Both can be re-run. On small databases (development, CI, fresh installs) the
 * migration does all of it itself.
 * ---------------------------------------------------------------------------
 */

const OPS = 'apps/api/db/ops/1789200000000-foreign-key-indexes.sql';
const ROLLBACK = 'apps/api/db/ops/1789200000000-foreign-key-indexes.rollback.sql';

export const FOREIGN_KEY_INDEXES: IndexSpec[] = [
  // Q1
  {
    table: 'user_role',
    name: 'IDX_user_role_organization',
    columns: ['"organizationId"'],
    where: '"organizationId" IS NOT NULL',
  },
  // Q2
  { table: 'user_role', name: 'IDX_user_role_role', columns: ['"roleId"'] },
];

export class IndexUnbackedForeignKeys1789200000000 implements MigrationInterface {
  name = 'IndexUnbackedForeignKeys1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await ensureIndexes(queryRunner, FOREIGN_KEY_INDEXES, OPS);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropIndexes(queryRunner, FOREIGN_KEY_INDEXES, ROLLBACK);
  }
}
