import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { group, loadCompiler, scan, stale, TARGETS } from './check-react-compiler.mjs';

// A component the compiler must skip (a ref written during render), one it
// compiles, and a module with no component in it at all.
const FIXTURES = {
  'bails.tsx': `import { useRef } from 'react';
export function Counter({ value }: { value: number }) {
  const last = useRef(value);
  last.current = value;
  return <span>{value}</span>;
}
`,
  'clean.tsx': `export function Greeting({ name }: { name: string }) {
  return <p>{name}</p>;
}
`,
  'plain.ts': `export const answer = 42;
`,
};

const root = mkdtempSync(join(tmpdir(), 'check-react-compiler-'));
mkdirSync(join(root, 'src'));
for (const [name, source] of Object.entries(FIXTURES))
  writeFileSync(join(root, 'src', name), source);
after(() => rmSync(root, { recursive: true, force: true }));

for (const target of TARGETS) {
  describe(`${target.app} (${target.compiler})`, () => {
    it('reports the function it leaves uncompiled, and only that one', async (t) => {
      const compile = await loadCompiler(target);
      if (!compile) return t.skip(`${target.app}'s compiler is not installed`);
      const report = await scan({ ...target, sources: ['src'] }, compile, root);
      assert.equal(report.files, 2, 'a file with no component or hook is not compiled');
      assert.deepEqual([...new Set(report.bailouts.map((found) => found.file))], ['src/bails.tsx']);
      assert.match(report.bailouts[0].reason, /ref/i);
      assert.equal(report.bailouts[0].line, 4);
    });
  });
}

describe('the baseline', () => {
  const bail = (app, file, line = 1) => ({ app, file, line, reason: 'refs', detail: null });
  const reports = [
    {
      app: 'apps/a',
      bailouts: [
        bail('apps/a', 'shared.tsx'),
        bail('apps/a', 'shared.tsx'),
        bail('apps/a', 'a.tsx'),
      ],
    },
    { app: 'apps/b', bailouts: [bail('apps/b', 'shared.tsx', 2), bail('apps/b', 'b.tsx')] },
  ];
  const baseline = { 'apps/a': ['shared.tsx', 'fixed.tsx'], 'apps/b': ['shared.tsx'] };

  it('prints a file two apps compile once, with its repeats folded', () => {
    const shared = group(reports, baseline).find((entry) => entry.file === 'shared.tsx');
    assert.deepEqual(shared.apps, ['apps/a', 'apps/b']);
    assert.deepEqual(
      shared.diagnostics.map(({ line, count, apps }) => ({ line, count, apps })),
      [
        { line: 1, count: 2, apps: ['apps/a'] },
        { line: 2, count: 1, apps: ['apps/b'] },
      ],
    );
  });

  it('flags a file only in the apps whose baseline does not list it', () => {
    const unlisted = group(reports, baseline)
      .filter((entry) => entry.unlisted.length > 0)
      .map(({ file, unlisted: apps }) => [file, apps]);
    assert.deepEqual(unlisted, [
      ['a.tsx', ['apps/a']],
      ['b.tsx', ['apps/b']],
    ]);
  });

  it('names the listed files that stopped bailing out, in the apps it scanned', () => {
    assert.deepEqual(stale(reports, baseline), [{ app: 'apps/a', file: 'fixed.tsx' }]);
    assert.deepEqual(stale([reports[1]], baseline), []);
  });
});
