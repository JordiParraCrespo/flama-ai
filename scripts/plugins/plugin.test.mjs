import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkFences, featureEntry, parseArgs } from './plugin.mjs';

test('featureEntry keeps the manifest key order and drops empty lists', () => {
  const entry = featureEntry({
    feature: {
      title: 'Widget',
      summary: 'apps/widget — a widget',
      identifiers: ['apps/widget'],
      paths: ['apps/widget'],
      requires: [],
      scripts: ['widget'],
    },
  });
  assert.deepEqual(Object.keys(entry), ['title', 'summary', 'identifiers', 'paths', 'scripts']);
  assert.deepEqual(entry.scripts, ['widget']);
});

test('a block must name its plugin in both fences', () => {
  const ok = '# flama:begin widget\nX=\n# flama:end widget';
  assert.equal(checkFences('widget', '.env.example', ok), null);

  // Co-owned fences count: the block leaves with the last of its owners.
  const shared = '# flama:begin gadget|widget\nX=\n# flama:end gadget|widget';
  assert.equal(checkFences('widget', '.env.example', shared), null);

  // A fence naming someone else would survive `plugin:remove` untouched.
  const wrong = '# flama:begin gadget\nX=\n# flama:end gadget';
  assert.match(checkFences('widget', '.env.example', wrong), /flama:begin widget/);

  // A half-fenced block is worse than none: the pruner would take the file apart.
  const half = '# flama:begin widget\nX=';
  assert.match(checkFences('widget', '.env.example', half), /flama:end widget/);
});

test('a fence naming a longer id does not count as this plugin', () => {
  const other = '# flama:begin widget-showcase\nX=\n# flama:end widget-showcase';
  assert.match(checkFences('widget', '.env.example', other), /flama:begin widget/);
});

test('parseArgs reads the command, the id and the source', () => {
  const add = parseArgs(['add', 'cli', '--from', '../flama-ai-plugins']);
  assert.equal(add.command, 'add');
  assert.equal(add.id, 'cli');
  assert.equal(add.source, '../flama-ai-plugins');
  assert.equal(add.dryRun, false);

  const dry = parseArgs(['remove', 'cli', '--dry-run', '--force']);
  assert.deepEqual(
    { command: dry.command, id: dry.id, dryRun: dry.dryRun, force: dry.force },
    { command: 'remove', id: 'cli', dryRun: true, force: true },
  );

  // `list` takes no id.
  assert.equal(parseArgs(['list']).command, 'list');
});
