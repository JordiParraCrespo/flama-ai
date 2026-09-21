import assert from 'node:assert/strict';
import { test } from 'node:test';
import { annotate, identifierRegex, MARKER_RE, MarkerError } from './markers.mjs';

// Fixtures name no real optional feature on purpose: `pnpm starter:check`
// scans this file, and a real id here would read as an unmarked reference.

test('annotate records nested blocks outer first and flags marker lines', () => {
  const lines = annotate(
    'f',
    [
      '# flama:begin widget',
      'a',
      '# flama:begin gadget',
      'b',
      '# flama:end gadget',
      '# flama:end widget',
    ].join('\n'),
  );
  assert.deepEqual(
    lines.map((entry) => entry.stack.map((block) => block.ids.join('|'))),
    [
      ['widget'],
      ['widget'],
      ['widget', 'gadget'],
      ['widget', 'gadget'],
      ['widget', 'gadget'],
      ['widget'],
    ],
  );
  assert.deepEqual(
    lines.map((entry) => entry.marker),
    [true, false, true, false, true, true],
  );
});

test('a marker may name several ids', () => {
  const lines = annotate('f', '# flama:begin widget|gadget\nx\n# flama:end widget|gadget');
  assert.deepEqual(lines[1].stack.at(-1).ids, ['widget', 'gadget']);
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

test('a line that merely mentions a marker is not one', () => {
  // The grammar anchors on the comment token, so prose and string literals
  // describing markers do not open blocks.
  assert.equal(MARKER_RE.exec("  const open = '# flama:begin widget';"), null);
  const lines = annotate('f', "  const open = '# flama:begin widget';");
  assert.equal(lines[0].marker, false);
  assert.deepEqual(lines[0].stack, []);
});

test('annotate throws MarkerError on unbalanced or mismatched markers', () => {
  // The grammar reports; the caller decides whether that is a warning or an
  // exit. `prune.mjs` wraps this into its own `fail`.
  for (const bad of [
    '# flama:begin widget\nx',
    'x\n# flama:end widget',
    '# flama:begin widget\n# flama:end gadget',
  ]) {
    assert.throws(() => annotate('f', bad), MarkerError);
  }
});

test('identifierRegex matches whole identifiers only', () => {
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
