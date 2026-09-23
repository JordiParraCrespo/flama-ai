import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { expandKeep, resolveRemoval } from './prune.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'prune.mjs');
const MANIFEST = JSON.parse(readFileSync(join(HERE, 'features.json'), 'utf8'));

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

test('--init is an operation, so it runs with nothing to remove', () => {
  // A project that keeps every app still wants the starter apparatus retired.
  // `--keep <all ids> --init` computes an empty removal list, which used to
  // exit early as "nothing to remove" — so the one command documented for
  // initialisation could never do the one thing it is named for.
  const keep = Object.keys(MANIFEST.features).join(',');
  const out = execFileSync(
    'node',
    [SCRIPT, '--keep', keep, '--init', '--dry-run', '--no-install'],
    { encoding: 'utf8' },
  );
  assert.match(out, /delete\s+\.agents\/skills\/starter-init/);
  assert.doesNotMatch(out, /nothing to remove/);
});
