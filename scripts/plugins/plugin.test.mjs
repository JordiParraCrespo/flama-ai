import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkFences, featureEntry, parseArgs } from './plugin.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'plugin.mjs');

/** Run the installer and return what it printed, whether or not it succeeded. */
function run(...args) {
  try {
    return { code: 0, out: execFileSync('node', [SCRIPT, ...args], { encoding: 'utf8' }) };
  } catch (error) {
    return { code: error.status, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

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

test('parseArgs reads the command, the id and where to get the plugin', () => {
  const add = parseArgs(['add', 'cli', '--from', '../flama-ai-plugins']);
  assert.equal(add.command, 'add');
  assert.equal(add.id, 'cli');
  assert.equal(add.from, '../flama-ai-plugins');
  assert.equal(add.dryRun, false);

  // No --from means fetch, so there is always a repo and a ref to fetch from.
  const fetched = parseArgs(['add', 'cli']);
  assert.equal(fetched.from, null);
  assert.match(fetched.repo, /flama-ai-plugins/);
  assert.equal(fetched.ref, 'main');

  const pinned = parseArgs(['add', 'cli', '--repo', 'git@host:me/forked.git', '--ref', 'v2']);
  assert.equal(pinned.repo, 'git@host:me/forked.git');
  assert.equal(pinned.ref, 'v2');

  const dry = parseArgs(['remove', 'cli', '--dry-run', '--force']);
  assert.deepEqual(
    { command: dry.command, id: dry.id, dryRun: dry.dryRun, force: dry.force },
    { command: 'remove', id: 'cli', dryRun: true, force: true },
  );

  // `list` takes no id.
  assert.equal(parseArgs(['list']).command, 'list');
});

test('a value flag will not swallow the next flag', () => {
  // `--from --force` should be a usage error, not an install from a directory
  // named "--force". parseArgs exits rather than throwing, so run it for real.
  const { code, out } = run('add', 'cli', '--from', '--force');
  assert.equal(code, 2);
  assert.match(out, /--from needs a value/);
});

test('--from is relative to the repo root, not the working directory', () => {
  // The same argument has to mean the same thing wherever it is typed, or a
  // project installs from whatever happens to sit beside its cwd.
  const { code, out } = run('list', '--from', 'scripts/starter');
  assert.equal(code, 2);
  assert.match(out, /no plugins\/ directory in scripts\/starter/);
});
