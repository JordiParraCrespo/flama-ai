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
 * Services (the API's integration and e2e suites) run whenever their package
 * is affected. Docker images are the expensive part, so they are gated by
 * event rather than by the diff alone: see `selectImages`.
 *
 * Outputs, written to $GITHUB_OUTPUT (and printed when run by hand):
 *
 *   scope     "all" or "affected"
 *   packages  JSON array of package names to run tasks for
 *   filters   `--filter=<name>` per package, empty when scope is "all"
 *   images    JSON array of apps whose Docker image to build
 *
 * `packages` and `filters` are also exported to later steps of the job as
 * AFFECTED_PACKAGES and AFFECTED_FILTERS ($GITHUB_ENV), which is how the
 * Check job's steps read them — and how `pnpm ci:local` runs the same steps.
 *
 *   node scripts/ci/affected.mjs                 # in CI: reads GITHUB_* env
 *   node scripts/ci/affected.mjs --base origin/main   # locally
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The label that asks a pull request for every affected image. */
export const FULL_LABEL = 'ci:full';

/** The events that build every affected image: main, and a merge queue. */
export const IMAGE_EVENTS = ['push', 'merge_group'];

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

/** The changed files no package owns, which widen a run to every package. */
export function globalChanges(changed) {
  return changed.filter((file) => GLOBAL_PATHS.some((re) => re.test(file)));
}

/**
 * Which images to build. On main, in a merge queue, or with the `ci:full`
 * label: every affected image. Otherwise only an image whose own build input
 * changed — its Dockerfile, or `.dockerignore`, which every image reads.
 */
export function selectImages({ packages, changed, event = null, labels = [] }) {
  const every = IMAGE_EVENTS.includes(event) || labels.includes(FULL_LABEL);
  const context = changed.includes('.dockerignore');
  return Object.entries(IMAGES)
    .filter(([, pkg]) => packages.includes(pkg))
    .filter(([app]) => every || context || changed.includes(`apps/${app}/Dockerfile`))
    .map(([app]) => app);
}

/**
 * What a run covers. `base` is the ref to diff against, or null for
 * everything. `worktree` counts uncommitted and untracked files as changed,
 * on both sides: the global-path check here and Turbo's own detection.
 */
export function affected({ base, event = null, labels = [], worktree = false }) {
  let scope = 'all';
  let reason = event === 'push' ? 'push to the default branch' : 'no base to diff against';
  let packages;
  let changed = [];

  if (base) {
    const since = worktree ? [git('merge-base', base, 'HEAD')] : [`${base}...HEAD`];
    changed = git('diff', '--name-only', ...since)
      .split('\n')
      .filter(Boolean);
    if (worktree)
      changed.push(
        ...git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean),
      );
    const global = globalChanges(changed);
    if (global.length > 0) {
      reason = `a change outside every package: ${global.slice(0, 5).join(', ')}${global.length > 5 ? ', …' : ''}`;
    } else {
      scope = 'affected';
      reason = `${changed.length} changed file(s) since ${base}`;
      // Pinning the head to HEAD would hide the working copy from Turbo;
      // left unset, its detection includes it.
      const head = worktree ? {} : { TURBO_SCM_HEAD: 'HEAD' };
      packages = turboPackages(['--affected'], { TURBO_SCM_BASE: base, ...head });
    }
  }
  if (scope === 'all') packages = turboPackages([]);
  packages.sort();

  const images = selectImages({ packages, changed, event, labels });
  const filters = scope === 'all' ? '' : packages.map((name) => `--filter=${name}`).join(' ');

  return { scope, reason, packages, filters, images };
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
    images: JSON.stringify(run.images),
  };

  const summary = [
    `**Scope:** ${run.scope} (${run.reason})`,
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
  if (process.env.GITHUB_ENV) {
    appendFileSync(
      process.env.GITHUB_ENV,
      `AFFECTED_PACKAGES=${outputs.packages}\nAFFECTED_FILTERS=${run.filters}\n`,
    );
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## What this run covers\n\n${summary}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
