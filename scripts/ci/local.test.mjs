import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { catalog } from './local.mjs';

const HOOK = fileURLToPath(new URL('../../.githooks/pre-push', import.meta.url));

const workflow = (steps) =>
  `jobs:\n  check:\n    steps:\n      - run: pnpm install\n      - id: scope\n        run: node scripts/ci/affected.mjs\n${steps}`;

test("the Check job's steps after scope are the local suite", () => {
  const names = catalog().map((step) => step.name);
  for (const name of [
    'Biome',
    'API structure',
    'Starter manifest',
    'Build',
    'Architecture boundaries',
    'Unit tests',
  ]) {
    assert.ok(names.includes(name), `${name} is missing from ${names.join(', ')}`);
  }
  assert.ok(!names.some((name) => /install/i.test(name)), 'setup before scope is not part of it');
});

test('a step ci:local cannot run the way the runner does is refused', () => {
  for (const [step, problem] of [
    ['      - name: X\n        if: always()\n        run: echo\n', '`if:`'],
    ['      - uses: actions/checkout@v4\n', '`uses:`'],
    ['      - name: X\n        run: echo ${{ github.sha }}\n', 'GitHub expression'],
    [
      '      - name: X\n        env:\n          A: ${{ steps.scope.outputs.packages }}\n        run: echo\n',
      'expression',
    ],
  ]) {
    assert.throws(() => catalog(workflow(step)), new RegExp(problem.replace(/[`$]/g, '.')));
  }
});

test('a plain step is taken with its name, body and literal env', () => {
  const [step] = catalog(
    workflow('      - name: Hello\n        env:\n          A: b\n        run: echo "$A"\n'),
  );
  assert.deepEqual(step, { name: 'Hello', run: 'echo "$A"', env: { A: 'b' } });
});

/** A throwaway repository with one commit; returns [dir, sha, tree]. */
function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'flama-pre-push-'));
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
  git('init', '-q');
  writeFileSync(join(dir, 'a.txt'), 'a\n');
  git('add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'a');
  return [dir, git('rev-parse', 'HEAD'), git('rev-parse', 'HEAD^{tree}')];
}

function prePush(dir, lines) {
  const env = { ...process.env };
  delete env.GITHUB_ACTIONS;
  return spawnSync('bash', [HOOK, 'origin', 'url'], {
    cwd: dir,
    input: `${lines.join('\n')}\n`,
    env,
  }).status;
}

test('pre-push refuses a commit whose tree was never recorded, and passes it once it is', () => {
  const [dir, sha, tree] = repo();
  try {
    const push = `refs/heads/main ${sha} refs/heads/main ${'0'.repeat(40)}`;
    assert.equal(prePush(dir, [push]), 1);
    writeFileSync(join(dir, '.git', 'flama-ci-ok'), `${tree}\n`);
    assert.equal(prePush(dir, [push]), 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pre-push checks every ref: a deletion passes, an untested ref beside it does not', () => {
  const [dir, sha] = repo();
  try {
    const deletion = `(delete) ${'0'.repeat(40)} refs/heads/stale ${sha}`;
    assert.equal(prePush(dir, [deletion]), 0);
    assert.equal(
      prePush(dir, [deletion, `refs/heads/main ${sha} refs/heads/main ${'0'.repeat(40)}`]),
      1,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
