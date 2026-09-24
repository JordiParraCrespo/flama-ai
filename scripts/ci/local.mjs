#!/usr/bin/env node
/**
 * The CI suite, run on this machine before a push — `pnpm ci:local`.
 *
 * Pull request CI is deliberately thin (see `affected.mjs`): one job that
 * confirms lint, the contracts and the affected unit tests. The loop that
 * finds the failures is this one, run where the change was made, so a push
 * arrives green and CI is not the place an agent iterates. It is the
 * `bin/ci` idea from Rails 8.1, with one difference: nothing here reports a
 * status to GitHub. A green local run is not an attestation anyone else has
 * to trust — it only saves CI the round trip.
 *
 * Every step runs over the packages `affected.mjs` selects against the base
 * branch, stops at the first failure, and prints the command to re-run it.
 * When everything passes, the tree that was tested is recorded in
 * `.git/flama-ci-ok`; the Claude Code hook `.agents/hooks/pre-push.sh` reads
 * that record and refuses a `git push` whose HEAD tree was never tested.
 * Uncommitted changes are part of the tree that is recorded, so a run before
 * the commit counts for the commit that holds exactly those changes.
 *
 *   pnpm ci:local                    # affected packages, against origin/main
 *   pnpm ci:local --base <ref>       # against another base
 *   pnpm ci:local --all              # every package
 *
 * The API's integration suite runs when the API is affected and a Docker
 * daemon answers; its e2e suite and the Docker images are CI's heavy tier
 * only, since they need services this command does not start.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { affected } from './affected.mjs';

/** Trees kept in the record; older ones fall off. */
const RECORD_LIMIT = 50;

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function has(command, ...args) {
  return spawnSync(command, args, { stdio: 'ignore' }).status === 0;
}

/**
 * The tree the working copy would commit as: tracked changes and untracked
 * files that are not ignored, written through a throwaway index so the real
 * one is untouched.
 */
function workingTree() {
  const index = join(tmpdir(), `flama-ci-index-${process.pid}`);
  const real = git('rev-parse', '--git-path', 'index');
  if (existsSync(real)) copyFileSync(real, index);
  const env = { ...process.env, GIT_INDEX_FILE: index };
  try {
    execFileSync('git', ['add', '-A'], { env, stdio: 'ignore' });
    return execFileSync('git', ['write-tree'], { env, encoding: 'utf8' }).trim();
  } finally {
    rmSync(index, { force: true });
  }
}

function record(tree) {
  const file = git('rev-parse', '--git-path', 'flama-ci-ok');
  const trees = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  const kept = [...trees.filter((t) => t !== tree), tree].slice(-RECORD_LIMIT);
  writeFileSync(file, `${kept.join('\n')}\n`);
}

const all = process.argv.includes('--all');
const flag = process.argv.indexOf('--base');
const base = all ? null : flag !== -1 ? process.argv[flag + 1] : 'origin/main';

const run = affected({ base, worktree: true });
const touched = (name) => run.packages.includes(name);
const filters = run.filters ? run.filters.split(' ') : [];
// flama:begin runner
const go = run.packages.some((name) => name.startsWith('@flama/go-') || name === '@flama/runner');
// flama:end runner

console.log(`ci:local — ${run.scope} (${run.reason}), ${run.packages.length} package(s)\n`);

/** [title, command, why it is skipped — or null to run it]. */
const steps = [
  ['Biome', ['pnpm', 'exec', 'biome', 'ci', '.'], null],
  ['Biome plugins', ['pnpm', 'check:biome-plugins'], null],
  ['API structure', ['pnpm', 'check:api-structure'], null],
  // flama:begin web|mobile
  ['Frontend structure', ['pnpm', 'check:structure'], null],
  // flama:end web|mobile
  ['Feature flags', ['pnpm', 'check:flags'], null],
  ['Repo scripts', ['pnpm', 'test:scripts'], null],
  ['Starter manifest', ['pnpm', 'starter:check'], null],
  [
    'Build',
    ['pnpm', 'turbo', 'run', 'build', ...filters],
    run.packages.length ? null : 'nothing affected',
  ],
  [
    'Architecture boundaries',
    ['pnpm', 'turbo', 'run', 'arch', ...filters],
    run.packages.length ? null : 'nothing affected',
  ],
  [
    'Unit tests',
    ['pnpm', 'turbo', 'run', 'test', ...filters],
    run.packages.length ? null : 'nothing affected',
  ],
  // flama:begin runner
  [
    'Go vet',
    ['go', 'vet', 'github.com/jordiparracrespo/flama-ai/...'],
    !go ? 'no Go module affected' : has('go', 'version') ? null : 'no Go toolchain',
  ],
  [
    'golangci-lint',
    ['sh', '-c', `golangci-lint run $(go list -m -f '{{.Dir}}/...')`],
    !go
      ? 'no Go module affected'
      : has('golangci-lint', 'version')
        ? null
        : 'not installed; CI runs it',
  ],
  // flama:end runner
  // flama:begin web
  [
    'First-load budgets',
    ['pnpm', 'check:bundle'],
    touched('@flama/web') ? null : '@flama/web not affected',
  ],
  // flama:end web
  [
    'API integration tests',
    ['pnpm', 'test:integration'],
    !touched('@flama/api')
      ? '@flama/api not affected'
      : has('docker', 'info')
        ? null
        : 'no Docker daemon; CI runs it',
  ],
];

const tree = workingTree();
const started = Date.now();
for (const [title, command, skip] of steps) {
  if (skip) {
    console.log(`\x1b[2m○ ${title} — skipped: ${skip}\x1b[0m`);
    continue;
  }
  console.log(`\x1b[1m▶ ${title}\x1b[0m  ${command.join(' ')}`);
  const t = Date.now();
  const { status } = spawnSync(command[0], command.slice(1), { stdio: 'inherit' });
  if (status !== 0) {
    console.error(`\n\x1b[31m✗ ${title} failed.\x1b[0m Fix it and run \`pnpm ci:local\` again.`);
    process.exit(1);
  }
  console.log(`\x1b[32m✓ ${title}\x1b[0m (${((Date.now() - t) / 1000).toFixed(1)}s)\n`);
}

const seconds = ((Date.now() - started) / 1000).toFixed(0);
if (workingTree() !== tree) {
  console.error(`\n\x1b[33m! Passed in ${seconds}s, but files changed while it ran.\x1b[0m`);
  console.error('  Nothing recorded: run `pnpm ci:local` again on the final tree.');
  process.exit(1);
}
record(tree);
console.log(
  `\x1b[32m✓ ci:local passed in ${seconds}s.\x1b[0m Tree ${tree.slice(0, 12)} recorded; it may be pushed.`,
);
