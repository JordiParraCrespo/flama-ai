import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');

type ExportEntry = Record<string, string>;
const { exports } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  exports: Record<string, ExportEntry>;
};

// `apps/web` resolves `flama-source`. A subpath without it hands the bundler the
// CommonJS build, whose `require('zod')` ships a second Zod with every locale.
describe('package exports', () => {
  it.each(Object.entries(exports))('%s resolves to its source for the web build', (_, entry) => {
    const source = entry['flama-source'];

    expect(source).toBe(entry.default.replace('./dist/', './src/').replace(/\.js$/, '.ts'));
    expect(existsSync(join(ROOT, source))).toBe(true);
  });
});
