#!/usr/bin/env node
/**
 * Decides what a CI run has to do from what the push or pull request changed.
 *
 * On a pull request, Turborepo's change detection (`turbo ls --affected`)
 * names the workspace packages the diff touches plus everything that depends
 * on them; the jobs then build, test and package only those. A push to main,
 * or a change to something no package owns but every job relies on (the
 * workflow itself, the lockfile, the Docker context), runs everything — the
 * safety net that keeps a selection mistake on a branch from reaching main.
 *
 * CI is split in two tiers, and this script says which one a run gets:
 *
 *   light  every pull request push: lint, the architecture and structure
 *          contracts, and the affected packages' build and unit tests, in
 *          one job. The agent that wrote the change has already run the same
 *          suite locally (`pnpm ci:local`, which imports this file), so this
 *          is a cheap confirmation, not the first time the code is exercised.
 *   heavy  what needs services or minutes: the API's integration and e2e
 *          suites and the Docker images. It runs on a push to main, in a
 *          merge queue, and on a pull request that changed a global path
 *          (the lockfile, the workflow, the Docker context — what images and
 *          every job depend on) or carries the `ci:full` label.
 *
 * On a light run an image is still built when its own Dockerfile changed.
 *
 * Outputs, written to $GITHUB_OUTPUT (and printed when run by hand):
 *
 *   scope     "all" or "affected"
 *   packages  JSON array of package names to run tasks for
 *   filters   `--filter=<name>` per package, empty when scope is "all"
 *   heavy     "true" or "false"
 *   images    JSON array of apps whose Docker image to build
 *
 *   node scripts/ci/affected.mjs                 # in CI: reads GITHUB_* env
 *   node scripts/ci/affected.mjs --base origin/main   # locally
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The label that asks a pull request for the heavy tier. */
const FULL_LABEL = 'ci:full';

/** App directory under apps/ → the workspace package the image is built from. */
export const IMAGES = {
  api: '@flama/api',
  // flama:begin web
  web: '@flama/web',
  // flama:end web
  // flama:plugins admin-web
  // flama:plugins docs
  // flama:begin mcp
  mcp: '@flama/mcp',
  // flama:end mcp
  // flama:begin runner
  runner: '@flama/runner',
  // flama:end runner
};

/**
 * Paths outside every package that can still break any of them. Turbo does
 * not attribute these to a package, so a change here means a full run.
 */
export const GLOBAL_PATHS = [
  /^\.github\//,
  /^docker\//,
  /^\.dockerignore$/,
  /^turbo\.json$/,
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^pnpm-workspace\.yaml$/,
  /^\.npmrc$/,
  /^\.env\.example$/,
  /^biome\.json$/,
  /^biome-plugins\//,
  /^tsconfig\.base\.json$/,
  /^scripts\//,
  // flama:begin runner
  /^go\.work/,
  /^\.golangci\.yml$/,
  // flama:end runner
];

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function turboPackages(args, env = {}) {
  const out = execFileSync('pnpm', ['exec', 'turbo', 'ls', '--output=json', ...args], {
    encoding: 'utf8',
    env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1', ...env },
  });
  return JSON.parse(out).packages.items.map((p) => p.name);
}

/** The webhook payload of the run, or null outside GitHub Actions. */
function eventPayload() {
  const path = process.env.GITHUB_EVENT_PATH;
  return path ? JSON.parse(readFileSync(path, 'utf8')) : null;
}

function ciBaseRef(event, payload) {
  // A merge queue tests a temporary branch whose base is the queue's head:
  // what the group adds on top of it is what the run has to cover.
  if (event === 'merge_group') return payload?.merge_group?.base_sha ?? null;
  // Set by GitHub on pull_request events only; a push has no base to diff against.
  const branch = process.env.GITHUB_BASE_REF;
  if (!branch) return null;
  // Make the remote-tracking ref exist and be current, whatever the checkout
  // fetched: both the diff and Turbo's SCM base read it, and a missing ref
  // would fail the job rather than fall back to a full run.
  execFileSync(
    'git',
    ['fetch', '--no-tags', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`],
    {
      stdio: 'inherit',
    },
  );
  return `origin/${branch}`;
}

/**
 * What a run covers. `base` is the ref to diff against, or null for
 * everything. `event` is the GitHub event name, absent when run by hand,
 * where the heavy tier is never implied; `worktree` counts uncommitted and
 * untracked files as changed.
 */
export function affected({ base, event = null, labels = [], worktree = false }) {
  let scope = 'all';
  let reason = event === 'push' ? 'push to the default branch' : 'no base to diff against';
  let packages;
  let changed = [];
  let global = [];

  if (base) {
    // By hand, the working copy counts too: what is about to be committed is
    // what has to pass. Turbo's own detection already includes it.
    const since = worktree ? [git('merge-base', base, 'HEAD')] : [`${base}...HEAD`];
    changed = git('diff', '--name-only', ...since)
      .split('\n')
      .filter(Boolean);
    if (worktree)
      changed.push(
        ...git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean),
      );
    global = changed.filter((file) => GLOBAL_PATHS.some((re) => re.test(file)));
    if (global.length > 0) {
      reason = `a change outside every package: ${global.slice(0, 5).join(', ')}${global.length > 5 ? ', …' : ''}`;
    } else {
      scope = 'affected';
      reason = `${changed.length} changed file(s) since ${base}`;
      packages = turboPackages(['--affected'], { TURBO_SCM_BASE: base, TURBO_SCM_HEAD: 'HEAD' });
    }
  }
  if (scope === 'all') packages = turboPackages([]);
  packages.sort();

  let heavy = false;
  let heavyReason = 'a pull request, light tier';
  if (event && event !== 'pull_request') {
    heavy = true;
    heavyReason = event;
  } else if (labels.includes(FULL_LABEL)) {
    heavy = true;
    heavyReason = `labelled ${FULL_LABEL}`;
  } else if (event && global.length > 0) {
    heavy = true;
    heavyReason = 'a global path changed';
  } else if (!event) {
    heavyReason = 'run by hand';
  }

  const images = Object.entries(IMAGES)
    .filter(([, pkg]) => packages.includes(pkg))
    .filter(([app]) => heavy || changed.includes(`apps/${app}/Dockerfile`))
    .map(([app]) => app);
  const filters = scope === 'all' ? '' : packages.map((name) => `--filter=${name}`).join(' ');

  return { scope, reason, packages, filters, heavy, heavyReason, images };
}

function main() {
  const event = process.env.GITHUB_EVENT_NAME || null;
  const payload = eventPayload();
  const flag = process.argv.indexOf('--base');
  const base = flag !== -1 ? process.argv[flag + 1] : ciBaseRef(event, payload);
  const labels = (payload?.pull_request?.labels ?? []).map((label) => label.name);
  const run = affected({ base, event, labels });

  const outputs = {
    scope: run.scope,
    packages: JSON.stringify(run.packages),
    filters: run.filters,
    heavy: String(run.heavy),
    images: JSON.stringify(run.images),
  };

  const summary = [
    `**Scope:** ${run.scope} (${run.reason})`,
    `**Tier:** ${run.heavy ? 'heavy' : 'light'} (${run.heavyReason})`,
    `**Packages (${run.packages.length}):** ${run.packages.join(', ') || 'none'}`,
    `**Images:** ${run.images.join(', ') || 'none'}`,
  ].join('\n\n');
  console.log(summary);

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      Object.entries(outputs)
        .map(([key, value]) => `${key}=${value}\n`)
        .join(''),
    );
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## What this run covers\n\n${summary}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
