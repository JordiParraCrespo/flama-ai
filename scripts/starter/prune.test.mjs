import assert from 'node:assert/strict';
import { test } from 'node:test';
import { expandKeep, resolveRemoval } from './prune.mjs';

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
  assert.deepEqual(expandKeep(manifest, ['qa']).kept.sort(), ['e2e', 'qa', 'web']);
  const { kept, notes } = expandKeep(manifest, ['qa']);
  // What it pulled in is reported, not printed: the caller decides.
  assert.equal(notes.length, 2);
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
