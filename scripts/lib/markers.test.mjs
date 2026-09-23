import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  annotate,
  blockAbove,
  dropBlocks,
  identifierRegex,
  MARKER_RE,
  MarkerError,
  markerIds,
  widenMarker,
} from './markers.mjs';

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

test('widenMarker is narrowMarker backwards', () => {
  const line = '# flama:begin web|mobile';
  assert.equal(widenMarker(line, 'admin-web', 1), '# flama:begin web|admin-web|mobile');
  assert.equal(widenMarker(line, 'zeta', 2), '# flama:begin web|mobile|zeta');
  // Already there: nothing to do, rather than a duplicate owner.
  const already = '# flama:begin web|admin-web';
  assert.equal(widenMarker(already, 'admin-web', 0), already);
  // Not a marker at all.
  assert.equal(widenMarker('const x = 1;', 'web', 0), 'const x = 1;');
  // The indentation and comment syntax are the line's, not ours.
  assert.equal(
    widenMarker('      // flama:end web|mobile', 'admin-web', 1),
    '      // flama:end web|admin-web|mobile',
  );
});

test('dropBlocks takes out what only the removed own, and narrows what they share', () => {
  const text = [
    'keep',
    '# flama:begin gone',
    'only-gone',
    '# flama:end gone',
    '',
    '',
    '# flama:begin gone|stays',
    'shared',
    '# flama:end gone|stays',
    '',
  ].join('\n');
  assert.equal(
    dropBlocks('f', text, new Set(['gone'])),
    ['keep', '', '# flama:begin stays', 'shared', '# flama:end stays', ''].join('\n'),
  );
  // A file with no blocks is not a rewrite; the caller skips it.
  assert.equal(dropBlocks('f', 'plain\n', new Set(['gone'])), null);
});

test('blockAbove finds the block a slot marks, and only that one', () => {
  const shared = [
    '# flama:begin alpha|beta',
    'x',
    '# flama:end alpha|beta',
    '',
    '# flama:plugins other-slot',
    '# flama:plugins the-slot',
  ].join('\n');
  // Blank lines and other anchors may sit between; the block is still marked.
  assert.deepEqual(blockAbove('f', shared, 'the-slot'), {
    ids: ['alpha', 'beta'],
    begin: 0,
    end: 2,
  });

  // With the shared block pruned, the slot marks nothing — even though some
  // other feature's block now sits further up. Reaching past it would widen
  // lines this slot never marked.
  const pruned = [
    '# flama:begin gamma',
    'y',
    '# flama:end gamma',
    'code',
    '# flama:plugins the-slot',
  ];
  assert.equal(blockAbove('f', pruned.join('\n'), 'the-slot'), null);
  assert.equal(blockAbove('f', '# flama:plugins the-slot', 'the-slot'), null);
  assert.equal(blockAbove('f', 'nothing here', 'the-slot'), null);

  // A nested block ending right above: the innermost block is the one marked.
  const nested = ['# flama:begin alpha', '# flama:begin beta', 'z', '# flama:end beta'];
  const withAnchor = [...nested, '# flama:plugins the-slot', '# flama:end alpha'].join('\n');
  assert.deepEqual(blockAbove('f', withAnchor, 'the-slot'), { ids: ['beta'], begin: 1, end: 3 });
});

test('markerIds reads the owners from the fences, not from the text', () => {
  const text =
    '# flama:begin alpha|beta\n# flama:begin gamma\n# flama:end gamma\n# flama:end alpha|beta';
  assert.deepEqual([...markerIds('f', text)].sort(), ['alpha', 'beta', 'gamma']);
});
