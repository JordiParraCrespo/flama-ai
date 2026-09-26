#!/usr/bin/env node
/**
 * The pull request suite, run on this machine before a push — `pnpm ci:local`.
 *
 * There is one step catalog: the Check job in `.github/workflows/ci.yml`.
 * This script reads the steps after its `scope` step and runs each `run:`
 * body the way the runner does (`bash -eo pipefail`), with the same
 * AFFECTED_PACKAGES / AFFECTED_FILTERS that `affected.mjs` computes, here
 * against origin/main. A step added to the job — by hand or by a plugin at
 * one of the job's anchors — is a step this runs, with nothing to restate.
 * So those steps stay plain shell: one with an `if:`, a `uses:` or a
 * GitHub expression is refused rather than guessed at.
 *
 * It stops at the first failure. When every step passes on a clean working
 * copy, HEAD's tree is recorded in `.git/flama-ci-ok`, which the `pre-push`
 * git hook (`.githooks/pre-push`) checks for every commit it pushes. Both
 * sides key on the commit's tree, so an amend or rebase that does not change
 * the content needs no second run. A run over uncommitted changes still
 * reports, but records nothing: the tree that passed is not one a push can
 * name yet.
 *
 *   pnpm ci:local                    # affected packages, against origin/main
 *   pnpm ci:local --base <ref>       # against another base
 *   pnpm ci:local --all              # every package
 *
 * The API's integration and e2e suites and the Docker images are jobs of
 * their own in CI, with services this command does not start.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { affected } from './affected.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const WORKFLOW = join(ROOT, '.github/workflows/ci.yml');

/** Trees kept in the record; older ones fall off. */
const RECORD_LIMIT = 50;

/**
 * The Check job's steps after `scope`, as `{ name, run, env }`. Throws on a
 * step this script could not run the way the runner does.
 */
export function catalog(workflow = readFileSync(WORKFLOW, 'utf8')) {
  const steps = parse(workflow).jobs?.check?.steps ?? [];
  const start = steps.findIndex((step) => step.id === 'scope');
  if (start === -1) throw new Error('ci.yml: the check job has no `scope` step');
  return steps.slice(start + 1).map((step, i) => {
    const name = step.name ?? step.run?.split('\n')[0] ?? `step ${start + i + 2}`;
    const problem = step.uses
      ? '`uses:`'
      : step.if !== undefined
        ? '`if:`'
        : !step.run
          ? 'no `run:`'
          : /\$\{\{/.test(JSON.stringify(step))
            ? 'a GitHub expression'
            : null;
    if (problem) {
      throw new Error(
        `ci.yml: check step "${name}" has ${problem}; ci:local runs these steps too, so they are plain shell over $AFFECTED_PACKAGES / $AFFECTED_FILTERS`,
      );
    }
    return { name, run: step.run, env: step.env ?? {} };
  });
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

/** HEAD's tree when the working copy has nothing uncommitted, else null. */
function cleanTree() {
  if (git('status', '--porcelain')) return null;
  return git('rev-parse', 'HEAD^{tree}');
}

function record(tree) {
  const file = git('rev-parse', '--git-path', 'flama-ci-ok');
  const trees = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  const kept = [...trees.filter((t) => t !== tree), tree].slice(-RECORD_LIMIT);
  writeFileSync(file, `${kept.join('\n')}\n`);
}

function main() {
  const steps = catalog();
  const all = process.argv.includes('--all');
  const flag = process.argv.indexOf('--base');
  const base = all ? null : flag !== -1 ? process.argv[flag + 1] : 'origin/main';

  const tree = cleanTree();
  const run = affected({ base, worktree: true });
  const env = {
    ...process.env,
    AFFECTED_PACKAGES: JSON.stringify(run.packages),
    AFFECTED_FILTERS: run.filters,
  };

  console.log(`ci:local — ${run.scope} (${run.reason}), ${run.packages.length} package(s)\n`);
  const started = Date.now();
  for (const step of steps) {
    console.log(`\x1b[1m▶ ${step.name}\x1b[0m`);
    const t = Date.now();
    const { status } = spawnSync('bash', ['-eo', 'pipefail', '-c', step.run], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...env, ...step.env },
    });
    if (status !== 0) {
      console.error(
        `\n\x1b[31m✗ ${step.name} failed.\x1b[0m Fix it and run \`pnpm ci:local\` again.`,
      );
      process.exit(1);
    }
    console.log(`\x1b[32m✓ ${step.name}\x1b[0m (${((Date.now() - t) / 1000).toFixed(1)}s)\n`);
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  if (!tree || cleanTree() !== tree) {
    console.log(`\x1b[33m✓ Passed in ${seconds}s over uncommitted changes.\x1b[0m`);
    console.log('  Nothing recorded: commit, then run `pnpm ci:local` again before pushing.');
    return;
  }
  record(tree);
  console.log(
    `\x1b[32m✓ ci:local passed in ${seconds}s.\x1b[0m Tree ${tree.slice(0, 12)} recorded; it may be pushed.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
