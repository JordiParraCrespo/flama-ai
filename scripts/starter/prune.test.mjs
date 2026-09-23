import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deleteJsonValue, expandKeep, resolveRemoval } from './prune.mjs';

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

test('deleteJsonValue takes a value off its own line, and the comma above it', () => {
  const text = '{\n  "ignore": [\n    "@flama/web",\n    "@flama/mobile"\n  ]\n}';
  assert.equal(
    deleteJsonValue(text, '@flama/mobile'),
    '{\n  "ignore": [\n    "@flama/web"\n  ]\n}',
  );
  assert.equal(
    deleteJsonValue(text, '@flama/web'),
    '{\n  "ignore": [\n    "@flama/mobile"\n  ]\n}',
  );
});

test('deleteJsonValue takes a value out of an array written on one line', () => {
  // The shape turbo.json keeps: the value is mid-line, and one of its
  // neighbours is a superstring of it.
  const outputs = '  "outputs": ["dist/**", ".next/**", "!.next/cache/**", "build/**"]';
  assert.equal(
    deleteJsonValue(outputs, '.next/**'),
    '  "outputs": ["dist/**", "!.next/cache/**", "build/**"]',
  );
  // Last member: it takes the comma before it instead.
  const env = '  "env": ["VITE_*", "EXPO_PUBLIC_*"],';
  assert.equal(deleteJsonValue(env, 'EXPO_PUBLIC_*'), '  "env": ["VITE_*"],');
  // Sole member.
  assert.equal(deleteJsonValue('  "env": ["VITE_*"],', 'VITE_*'), '  "env": [],');
});

test('deleteJsonValue reports a value it cannot find rather than guessing', () => {
  assert.equal(deleteJsonValue('  "env": ["VITE_*"],', 'NOPE_*'), null);
});
