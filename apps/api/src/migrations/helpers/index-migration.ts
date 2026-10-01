import type { QueryRunner } from 'typeorm';

/**
 * One index, declared once. The migration builds it from this, the ops script
 * for a large table carries the same statement (`indexStatement`), and the
 * check of an existing index compares against the same tail, so the three
 * cannot drift.
 */
export interface IndexSpec {
  table: string;
  name: string;
  method?: 'btree' | 'gin';
  /** The key columns as SQL, operator class included: `"firstName" gin_trgm_ops`. */
  columns: string[];
  /** A partial index's predicate as SQL, without `WHERE`. */
  where?: string;
}

/** `USING … (…) [WHERE …]`, what `pg_get_indexdef` ends with. */
function tail({ method = 'btree', columns, where }: IndexSpec): string {
  return `USING ${method} (${columns.join(', ')})${where ? ` WHERE ${where}` : ''}`;
}

/** The statement the migration runs, and the ops script runs `concurrently`. */
export function indexStatement(spec: IndexSpec, concurrently = false): string {
  return concurrently
    ? `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${spec.name}" ON "${spec.table}" ${tail(spec)};`
    : `CREATE INDEX "${spec.name}" ON "${spec.table}" ${tail(spec)};`;
}

/**
 * Compare definitions without depending on how Postgres quotes or
 * parenthesizes them: `"firstName"` and `firstName`, `WHERE x IS NOT NULL` and
 * `WHERE (x IS NOT NULL)` are the same index.
 */
const normalized = (sql: string) => sql.replace(/["()\s]/g, '').toLowerCase();

type IndexState = 'valid' | 'outdated' | 'invalid' | 'missing';

async function indexState(queryRunner: QueryRunner, spec: IndexSpec): Promise<IndexState> {
  const [row] = await queryRunner.query(
    `SELECT i.indisvalid AS valid, pg_get_indexdef(i.indexrelid) AS definition
       FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
      WHERE c.relname = $1 AND c.relnamespace = 'public'::regnamespace`,
    [spec.name],
  );
  if (!row) return 'missing';
  if (!row.valid) return 'invalid';
  return normalized(row.definition as string).endsWith(normalized(tail(spec)))
    ? 'valid'
    : 'outdated';
}

/**
 * The one gate: boot migrations share a transaction that holds every lock
 * until it commits, so on a table over 100k rows or 128 MB the migration only
 * checks the work and points at the ops script.
 */
async function refuseIfLarge(
  queryRunner: QueryRunner,
  table: string,
  what: string,
  script: string,
): Promise<void> {
  const [row] = await queryRunner.query(
    `SELECT c.reltuples > 100000 OR pg_total_relation_size(c.oid) > 128 * 1024 * 1024 AS large
       FROM pg_class c WHERE c.oid = $1::regclass`,
    [`"${table}"`],
  );
  if (row.large === true) {
    throw new Error(
      `${what} and "${table}" is too large to change it at boot. Run ${script} first (see the migration's header).`,
    );
  }
}

/** Build each index that is missing, invalid or different; a large table is the ops script's. */
export async function ensureIndexes(
  queryRunner: QueryRunner,
  specs: readonly IndexSpec[],
  opsScript: string,
): Promise<void> {
  await queryRunner.query(`SET LOCAL lock_timeout = '5s'`);
  for (const spec of specs) {
    const state = await indexState(queryRunner, spec);
    if (state === 'valid') continue;
    await refuseIfLarge(queryRunner, spec.table, `${spec.name} is ${state}`, opsScript);
    if (state !== 'missing') await queryRunner.query(`DROP INDEX "${spec.name}"`);
    await queryRunner.query(indexStatement(spec));
  }
  await queryRunner.query(`RESET lock_timeout`);
}

/** Drop each index that is there; a large table is the rollback script's. */
export async function dropIndexes(
  queryRunner: QueryRunner,
  specs: readonly IndexSpec[],
  rollbackScript: string,
): Promise<void> {
  await queryRunner.query(`SET LOCAL lock_timeout = '5s'`);
  for (const spec of [...specs].reverse()) {
    if ((await indexState(queryRunner, spec)) === 'missing') continue;
    await refuseIfLarge(queryRunner, spec.table, `${spec.name} is still there`, rollbackScript);
    await queryRunner.query(`DROP INDEX IF EXISTS "${spec.name}"`);
  }
  await queryRunner.query(`RESET lock_timeout`);
}
