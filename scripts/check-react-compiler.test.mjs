import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { loadCompiler, scan, TARGETS } from './check-react-compiler.mjs';

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
