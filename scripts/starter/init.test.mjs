import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs, plan } from './init.mjs';

// Ids nothing in the real manifest uses, so `pnpm starter:check` does not read
// this file as unmarked references to real features.
const manifest = {
  features: {
    alpha: { paths: [] },
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

test('plan keeps what was asked, removes the rest, and pulls in what a kept app requires', () => {
  const result = plan(manifest, plugins, ['beta'], []);
  assert.deepEqual(result.keep.sort(), ['alpha', 'beta']);
  assert.deepEqual(result.remove, ['gamma']);
  assert.deepEqual(result.add, []);
});

test('plan installs plugins after the plugins they require, and says which it pulled in', () => {
  const result = plan(manifest, plugins, ['alpha'], ['pack', 'site']);
  assert.deepEqual(result.add, ['panel', 'pack', 'site']);
  assert.deepEqual(result.pulled, ['panel']);
});

test('plan refuses a plugin whose required app the same choice removes', () => {
  const result = plan(manifest, plugins, ['gamma'], ['panel']);
  assert.ok(result.problems.some((p) => /"panel" needs "alpha"/.test(p)));
});

test('plan refuses a plugin that builds on a shared package the prune takes', () => {
  // `kit-a` goes when `alpha` goes. Refusing up front beats a half-installed
  // project: the prune would already have run when the install failed.
  const withoutRequire = {
    ...plugins,
    panel: { feature: { shared: [{ path: 'packages/kit-a' }] } },
  };
  const result = plan(manifest, withoutRequire, ['gamma'], ['panel']);
  assert.ok(result.problems.some((p) => /builds on packages\/kit-a/.test(p)));

  // Unless the plugin carries the package itself.
  const carrying = {
    ...withoutRequire,
    panel: { ...withoutRequire.panel, sharedFiles: { 'packages/kit-a': 'shared/kit-a' } },
  };
  assert.equal(plan(manifest, carrying, ['gamma'], ['panel']).problems, undefined);
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
  // Keeping nothing does not remove a plugin: the prune is of what shipped.
  assert.ok(!plan(installed, plugins, [], []).remove.includes('site'));
});

test('parseArgs reads the choice and the plugin source', () => {
  const options = parseArgs(['--keep', 'web,e2e', '--add', 'docs', '--yes', '--from', '../p']);
  assert.deepEqual(options.keep, ['web', 'e2e']);
  assert.deepEqual(options.add, ['docs']);
  assert.equal(options.yes, true);
  assert.equal(options.source.from, '../p');
  // An empty keep list is a choice (the API alone), not a missing value.
  assert.deepEqual(parseArgs(['--keep', '', '--add', '']).keep, []);
});
