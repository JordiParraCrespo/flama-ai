import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ANCHOR_RE,
  annotate,
  collapseBlankRuns,
  identifierRegex,
  isPluginId,
  isPluginMarker,
  isText,
  MARKER_RE,
} from './markers.mjs';

test('a namespaced plugin id survives as one id', () => {
  // Without `:` in the id class this parses as `plugin`, and every installed
  // plugin shares a single marker id.
  const [, kind, spec] = MARKER_RE.exec('// flama:begin plugin:stripe');
  assert.equal(kind, 'begin');
  assert.equal(spec, 'plugin:stripe');

  const lines = annotate('f', '// flama:begin plugin:stripe\nx\n// flama:end plugin:stripe');
  assert.deepEqual(lines[0].ids, ['plugin:stripe']);
  assert.deepEqual(lines[1].stack.at(-1).ids, ['plugin:stripe']);
});

test('annotate reports each marker line its own ids', () => {
  const lines = annotate('f', '# flama:begin widget|gadget\nx\n# flama:end widget|gadget');
  assert.deepEqual(lines[0].ids, ['widget', 'gadget']);
  assert.equal(lines[1].ids, null);
  assert.deepEqual(lines[2].ids, ['widget', 'gadget']);
});

test('starter ids and plugin ids are told apart', () => {
  assert.ok(isPluginId('plugin:stripe'));
  assert.ok(!isPluginId('widget'));
  assert.ok(!isPluginId('plugins'));

  assert.ok(isPluginMarker(['plugin:stripe']));
  assert.ok(isPluginMarker(['plugin:stripe', 'plugin:revenuecat']));
  // A block a feature also owns is the pruner's to remove, not the installer's.
  assert.ok(!isPluginMarker(['plugin:stripe', 'widget']));
  assert.ok(!isPluginMarker([]));
});

test('an anchor is not a marker', () => {
  // Anchors mark where a plugin block is inserted. `annotate` must ignore
  // them, or a prune would treat one as an unbalanced block.
  const lines = annotate('f', '// flama:plugins api-modules\nx');
  assert.ok(!lines[0].marker);
  assert.equal(lines[0].ids, null);
  assert.deepEqual(lines[0].stack, []);

  const [, indent, slot] = ANCHOR_RE.exec('    // flama:plugins api-modules');
  assert.equal(indent, '    ');
  assert.equal(slot, 'api-modules');
  assert.equal(ANCHOR_RE.exec('# flama:plugins scope-resources')[2], 'scope-resources');
  assert.equal(ANCHOR_RE.exec('// flama:begin plugin:stripe'), null);
});

test('annotate accepts every comment syntax', () => {
  for (const [open, close] of [
    ['# flama:begin widget', '# flama:end widget'],
    ['// flama:begin widget', '// flama:end widget'],
    ['<!-- flama:begin widget -->', '<!-- flama:end widget -->'],
    ['{{- /* flama:begin widget */}}', '{{- /* flama:end widget */}}'],
  ]) {
    const lines = annotate('f', [open, 'x', close].join('\n'));
    assert.deepEqual(lines[1].stack.at(-1).ids, ['widget']);
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
    assert.throws(() => annotate('f', '# flama:begin widget\nx'));
    assert.throws(() => annotate('f', 'x\n# flama:end widget'));
    assert.throws(() => annotate('f', '# flama:begin widget\n# flama:end gadget'));
    assert.throws(() => annotate('f', '// flama:begin plugin:stripe\n// flama:end plugin:leads'));
  } finally {
    process.exit = original;
  }
  assert.deepEqual(exits, [2, 2, 2, 2]);
});

test('identifierRegex matches whole identifiers only', () => {
  // Fixtures name no real optional feature on purpose: `pnpm starter:check`
  // scans this file, and a real id here would read as an unmarked reference.
  const app = identifierRegex('apps/widget');
  assert.ok(app.test('COPY apps/widget/package.json'));
  assert.ok(!app.test('apps/widget-showcase'));
  assert.ok(!app.test('@acme/apps/widget'));
  const scoped = identifierRegex('@acme/widget');
  assert.ok(scoped.test('"@acme/widget": "workspace:*"'));
  assert.ok(!scoped.test('@acme/widget-showcase'));
  const prefix = identifierRegex('@acme/mod-');
  assert.ok(prefix.test('@acme/mod-core'));
});

test('isText rejects a buffer with a NUL byte', () => {
  assert.ok(isText(Buffer.from('plain text')));
  assert.ok(!isText(Buffer.from([0x61, 0x00, 0x62])));
});

test('collapseBlankRuns leaves one blank line', () => {
  assert.equal(collapseBlankRuns('a\n\n\n\nb'), 'a\n\nb');
  assert.equal(collapseBlankRuns('a\n\nb'), 'a\n\nb');
});
