import assert from 'node:assert/strict';
import { test } from 'node:test';
import { choice, DEFAULT_ADD, DEFAULT_KEEP, parseArgs, plan } from './init.mjs';

// Ids nothing in the real manifest uses, so `pnpm starter:check` does not read
// this file as unmarked references to real features.
const manifest = {
  features: {
    alpha: { paths: ['alpha'] },
    beta: { paths: [], requires: ['alpha'] },
    gamma: { paths: [] },
  },
  shared: {
    'packages/kit-a': { neededBy: ['alpha'] },
  },
};

const plugins = {
  panel: { feature: { requires: ['alpha'], shared: [{ path: 'packages/kit-a' }] } },
  pack: { feature: { requires: ['panel'] } },
  site: { feature: {} },
};

/** Run `fn`, failing if it writes to the console: `plan()` is pure. */
function silently(fn) {
  const spoken = [];
  const saved = { log: console.log, warn: console.warn, error: console.error };
  for (const name of Object.keys(saved)) console[name] = (...args) => spoken.push(args.join(' '));
  try {
    return fn();
  } finally {
    Object.assign(console, saved);
    assert.deepEqual(spoken, [], 'plan() printed; the CLI prints, the planner returns');
  }
}

test('plan keeps what was asked, removes the rest, and says what it pulled in', () => {
  const result = silently(() => plan(manifest, plugins, ['beta'], []));
  assert.deepEqual(result.keep.sort(), ['alpha', 'beta']);
  assert.deepEqual(result.remove, ['gamma']);
  assert.deepEqual(result.add, []);
  // Reported as data, where a dry run and a real run both show it.
  assert.deepEqual(result.notes, ['keeping alpha too: a kept feature requires it']);
});

test('plan installs plugins after the plugins they require', () => {
  const result = silently(() => plan(manifest, plugins, ['alpha'], ['pack', 'site']));
  assert.deepEqual(result.add, ['panel', 'pack', 'site']);
  assert.deepEqual(result.pulled, ['panel']);
  assert.ok(result.notes.includes('adding panel too: a chosen plugin requires it'));
});

test('plan refuses a plugin whose required app the same choice removes', () => {
  const result = silently(() => plan(manifest, plugins, ['gamma'], ['panel']));
  assert.ok(result.problems.some((p) => /"panel" requires "alpha"/.test(p)));
});

test('plan refuses a plugin that builds on a shared package the prune takes', () => {
  // `kit-a` goes when `alpha` goes. Refusing up front is the point: the same
  // rule the installer applies, asked of the tree this choice would leave.
  const bare = { ...plugins, panel: { feature: { shared: [{ path: 'packages/kit-a' }] } } };
  const result = silently(() => plan(manifest, bare, ['gamma'], ['panel']));
  assert.ok(result.problems.some((p) => /builds on packages\/kit-a/.test(p)));

  // Unless the plugin carries the package itself.
  const carrying = {
    ...bare,
    panel: { ...bare.panel, sharedFiles: { 'packages/kit-a': 'shared/kit-a' } },
  };
  assert.equal(plan(manifest, carrying, ['gamma'], ['panel']).problems, undefined);

  // A path inside a removed feature's tree is gone too, tracked or not.
  const inside = { ...plugins, panel: { feature: { shared: [{ path: 'alpha/kit' }] } } };
  assert.ok(plan(manifest, inside, ['gamma'], ['panel']).problems[0].includes('alpha/kit'));
});

test('plan names unknown apps and plugins instead of guessing', () => {
  const result = plan(manifest, plugins, ['delta'], ['nope']);
  assert.deepEqual(result.problems, [
    '"delta" is not an app this starter ships',
    'there is no plugin "nope"',
  ]);
});

test('an installed plugin is not offered again, and is not a shipped app to keep', () => {
  const installed = {
    ...manifest,
    features: { ...manifest.features, site: { paths: [], plugin: true } },
  };
  assert.ok(
    plan(installed, plugins, ['alpha'], ['site']).problems[0].includes('already installed'),
  );
  // Keeping nothing does not remove a plugin that needs nothing shipped.
  assert.ok(!plan(installed, plugins, [], []).remove.includes('site'));
});

test('a plugin that requires a dropped app is in the plan, not removed behind its back', () => {
  // Re-running init on a project with `panel` installed, and dropping the
  // `alpha` it requires: the prune takes `panel` too, so the plan says so.
  const installed = {
    ...manifest,
    features: { ...manifest.features, panel: { paths: [], plugin: true, requires: ['alpha'] } },
  };
  const result = silently(() => plan(installed, plugins, ['gamma'], []));
  assert.ok(result.remove.includes('panel'));
  assert.ok(result.notes.includes('panel requires alpha, so it goes too'));
});

test('one default, whichever way it is run', () => {
  // No `--add` is the questions' default, not "nothing": an agent passing
  // only `--keep` gets the project a person pressing Enter would.
  assert.deepEqual(choice(parseArgs(['--keep', 'web', '--yes'])), {
    keep: ['web'],
    add: DEFAULT_ADD,
  });
  assert.deepEqual(choice(parseArgs(['--add', 'docs'])).keep, DEFAULT_KEEP);
  // An empty list is a choice: the API alone, nothing added.
  assert.deepEqual(choice(parseArgs(['--keep', '', '--add', ''])), { keep: [], add: [] });
});

test('parseArgs reads the plugin source', () => {
  const options = parseArgs(['--keep', 'web,e2e', '--yes', '--from', '../p', '--ref', 'v1']);
  assert.deepEqual(options.keep, ['web', 'e2e']);
  assert.equal(options.yes, true);
  assert.equal(options.source.from, '../p');
  assert.equal(options.source.ref, 'v1');
});
