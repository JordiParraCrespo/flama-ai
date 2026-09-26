import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FULL_LABEL, globalChanges, selectImages } from './affected.mjs';

const packages = ['@flama/api', '@flama/shared'];

test('a pull request builds no image when no Dockerfile changed', () => {
  const changed = ['apps/api/src/main.ts'];
  assert.deepEqual(selectImages({ packages, changed, event: 'pull_request' }), []);
});

test('a pull request builds an image whose own Dockerfile changed', () => {
  const changed = ['apps/api/Dockerfile'];
  assert.deepEqual(selectImages({ packages, changed, event: 'pull_request' }), ['api']);
});

test('a .dockerignore change builds every affected image', () => {
  const changed = ['.dockerignore'];
  assert.deepEqual(selectImages({ packages, changed, event: 'pull_request' }), ['api']);
});

test('main, a merge queue and the label build every affected image', () => {
  for (const run of [
    { event: 'push' },
    { event: 'merge_group' },
    { event: 'pull_request', labels: [FULL_LABEL] },
  ]) {
    assert.deepEqual(selectImages({ packages, changed: [], ...run }), ['api'], JSON.stringify(run));
  }
});

test('an event not named for images builds none', () => {
  assert.deepEqual(selectImages({ packages, changed: [], event: 'workflow_dispatch' }), []);
});

test('an image whose package is not affected is never built', () => {
  const changed = ['apps/api/Dockerfile'];
  assert.deepEqual(selectImages({ packages: ['@flama/shared'], changed, event: 'push' }), []);
});

test('by hand, only a changed Dockerfile selects an image', () => {
  assert.deepEqual(selectImages({ packages, changed: [] }), []);
  assert.deepEqual(selectImages({ packages, changed: ['apps/api/Dockerfile'] }), ['api']);
});

test('global paths are the files no package owns', () => {
  const changed = [
    'pnpm-lock.yaml',
    '.github/workflows/ci.yml',
    'apps/api/src/main.ts',
    'scripts/ci/local.mjs',
  ];
  assert.deepEqual(globalChanges(changed), [
    'pnpm-lock.yaml',
    '.github/workflows/ci.yml',
    'scripts/ci/local.mjs',
  ]);
});
