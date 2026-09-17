import assert from 'node:assert/strict';
import { test } from 'node:test';
import { annotate, expandKeep, identifierRegex, resolveRemoval } from './prune.mjs';

const manifest = {
  features: {
    web: { paths: [] },
    'admin-web': { paths: [] },
    e2e: { paths: [] },
    qa: { paths: [], requires: ['web', 'e2e'] },
    mobile: { paths: [] },
  },
  shared: {
    'packages/frontend/design-system/web': { neededBy: ['web', 'admin-web'] },
    'packages/frontend': { neededBy: ['web', 'mobile'] },
  },
};

test('resolveRemoval cascades through requires', () => {
  const { features } = resolveRemoval(manifest, ['web']);
  assert.deepEqual(features.sort(), ['qa', 'web']);
});

test('expandKeep pulls in what a kept feature requires, so --keep never removes it', () => {
  assert.deepEqual(expandKeep(manifest, ['qa']).sort(), ['e2e', 'qa', 'web']);
  const kept = expandKeep(manifest, ['qa']);
  const removed = Object.keys(manifest.features).filter((id) => !kept.includes(id));
  assert.ok(!resolveRemoval(manifest, removed).features.includes('qa'));
});

test('resolveRemoval drops a shared path only when every dependant is gone', () => {
  assert.deepEqual(resolveRemoval(manifest, ['web']).shared, []);
  assert.deepEqual(resolveRemoval(manifest, ['web', 'mobile']).shared, ['packages/frontend']);
  assert.deepEqual(resolveRemoval(manifest, ['web', 'admin-web', 'mobile']).shared.sort(), [
    'packages/frontend',
    'packages/frontend/design-system/web',
  ]);
});

test('annotate records nested blocks outer first and flags marker lines', () => {
  const lines = annotate(
    'x.yml',
    [
      'a',
      '# flama:begin cli|mcp',
      'b',
      '  // flama:begin cli',
      'c',
      '  // flama:end cli',
      '# flama:end cli|mcp',
      'd',
    ].join('\n'),
  );
  assert.deepEqual(
    lines.map(({ stack, marker }) => [stack.map((s) => s.ids.join('|')), marker]),
    [
      [[], false],
      [['cli|mcp'], true],
      [['cli|mcp'], false],
      [['cli|mcp', 'cli'], true],
      [['cli|mcp', 'cli'], false],
      [['cli|mcp', 'cli'], true],
      [['cli|mcp'], true],
      [[], false],
    ],
  );
});

test('annotate accepts every comment syntax', () => {
  for (const [open, close] of [
    ['# flama:begin web', '# flama:end web'],
    ['// flama:begin web', '// flama:end web'],
    ['<!-- flama:begin web -->', '<!-- flama:end web -->'],
    ['{{- /* flama:begin web */ -}}', '{{- /* flama:end web */ -}}'],
  ]) {
    const lines = annotate('f', [open, 'x', close].join('\n'));
    assert.equal(lines[1].stack.length, 1, open);
  }
});

test('annotate fails on unbalanced or mismatched markers', () => {
  const exits = [];
  const original = process.exit;
  process.exit = (code) => {
    exits.push(code);
    throw new Error('exit');
  };
  try {
    assert.throws(() => annotate('f', '# flama:begin web\nx'));
    assert.throws(() => annotate('f', 'x\n# flama:end web'));
    assert.throws(() => annotate('f', '# flama:begin web\n# flama:end mobile'));
  } finally {
    process.exit = original;
  }
  assert.deepEqual(exits, [2, 2, 2]);
});

test('identifierRegex matches whole identifiers only', () => {
  const web = identifierRegex('apps/web');
  assert.ok(web.test('COPY apps/web/package.json'));
  assert.ok(!web.test('apps/web-showcase'));
  assert.ok(!web.test('@flama/apps/web'));
  const pkg = identifierRegex('@flama/web');
  assert.ok(pkg.test('"@flama/web": "workspace:*"'));
  assert.ok(!pkg.test('@flama/web-showcase'));
  const prefix = identifierRegex('@flama/go-');
  assert.ok(prefix.test('@flama/go-core'));
});
