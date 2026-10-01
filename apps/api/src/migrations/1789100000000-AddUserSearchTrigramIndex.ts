import type { MigrationInterface, QueryRunner } from 'typeorm';
import { dropIndexes, ensureIndexes, type IndexSpec } from './helpers/index-migration';

/**
 * A trigram index for the admin user search.
 *
 * The query it serves is `UserRepository.findUsers` with a `search` term
 * (`GET /v1/users?search=`): three `ILIKE '%term%'` conditions OR'd across
 * `"firstName"`, `"lastName"` and `"email"`, the term's own `%` and `_`
 * escaped (`likeContains`). A B-tree cannot serve a leading wildcard, so every
 * search was a sequential scan of `user`, twice (the page and its count). One
 * multi-column GIN with `gin_trgm_ops` on each column serves all three: the
 * planner answers the OR with a BitmapOr of three scans of this one index.
 *
 * - Trigrams help only for a term of three characters or more. A shorter term
 *   yields no trigram to look up and still scans; that is acceptable for an
 *   admin search, where one or two characters select most of the table anyway.
 * - `pg_trgm` is a trusted extension since Postgres 13, so the database owner
 *   can create it without a superuser. `down()` leaves it installed: other
 *   objects may use it by then, and an unused extension costs nothing.
 * - `user` is a Better Auth table (`.agents/rules/database-design.md`, "Two
 *   kinds of table"). An index is allowed; no column changes.
 * - The index is declared on `UserOrmEntity` with `synchronize: false`, since
 *   TypeORM cannot express GIN.
 *
 * ---------------------------------------------------------------------------
 * Large databases (`user` over 100k rows or 128 MB): run the ops script.
 *
 * Boot migrations share one transaction and hold every lock until it commits.
 * `CREATE INDEX` takes a SHARE lock that blocks every write to `user`, sign-ups
 * and sign-ins included, for the whole deploy; `CREATE INDEX CONCURRENTLY`
 * cannot run in a transaction, and the data sources run
 * `migrationsTransactionMode: 'all'`. So on a large `user` table this migration
 * only checks that the index exists and is valid, and fails with a pointer here
 * if it is not. Before deploying, run with psql in autocommit mode
 * `apps/api/db/ops/1789100000000-user-search-trigram-index.sql`; before
 * reverting, `apps/api/db/ops/1789100000000-user-search-trigram-index.rollback.sql`.
 * Both can be re-run. On small databases (development, CI, fresh installs) the
 * migration builds or drops the index itself.
 * ---------------------------------------------------------------------------
 */

const OPS = 'apps/api/db/ops/1789100000000-user-search-trigram-index.sql';
const ROLLBACK = 'apps/api/db/ops/1789100000000-user-search-trigram-index.rollback.sql';

export const USER_SEARCH_INDEXES: IndexSpec[] = [
  {
    table: 'user',
    name: 'IDX_user_search_trgm',
    method: 'gin',
    columns: ['"firstName" gin_trgm_ops', '"lastName" gin_trgm_ops', '"email" gin_trgm_ops'],
  },
];

export class AddUserSearchTrigramIndex1789100000000 implements MigrationInterface {
  name = 'AddUserSearchTrigramIndex1789100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await ensureIndexes(queryRunner, USER_SEARCH_INDEXES, OPS);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropIndexes(queryRunner, USER_SEARCH_INDEXES, ROLLBACK);
  }
}
