import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { USER_SEARCH_INDEXES } from '../1789100000000-AddUserSearchTrigramIndex';
import { FOREIGN_KEY_INDEXES } from '../1789200000000-IndexUnbackedForeignKeys';
import { type IndexSpec, indexStatement } from '../helpers/index-migration';

const OPS_DIR = resolve(__dirname, '../../../db/ops');
const flat = (sql: string) => sql.replace(/\s+/g, ' ');

/**
 * The ops script a large table runs is the migration's index, built
 * `CONCURRENTLY`: each carries the statement the shared spec renders, so the two
 * cannot describe different indexes.
 */
describe.each([
  ['1789100000000-user-search-trigram-index', USER_SEARCH_INDEXES],
  ['1789200000000-foreign-key-indexes', FOREIGN_KEY_INDEXES],
] as [string, IndexSpec[]][])('%s ops scripts', (file, specs) => {
  it('builds exactly the indexes of the migration spec', () => {
    const script = flat(readFileSync(resolve(OPS_DIR, `${file}.sql`), 'utf8'));
    for (const spec of specs) expect(script).toContain(indexStatement(spec, true));
  });

  it('drops them in the rollback script', () => {
    const script = readFileSync(resolve(OPS_DIR, `${file}.rollback.sql`), 'utf8');
    for (const spec of specs) {
      expect(script).toContain(`DROP INDEX CONCURRENTLY IF EXISTS "${spec.name}";`);
    }
  });
});
