#!/usr/bin/env node
/**
 * Run the checks a frontend change has to pass, in the order a reviewer would
 * care about them, and stop at the first that fails.
 *
 *   node .agents/skills/scaffold-feature/scripts/verify-feature.mjs --app web [--module api-tokens] [--base main]
 *
 * 1. pnpm check:structure: placement, names, the render-topology scans and
 *    the tests that pin them
 * 2. dependency-cruiser: the app, plus every frontend package the branch
 *    touched
 * 3. Biome: the query-key, skipToken and mutation plugins included
 * 4. the typecheck (web): workspace packages built first, since the app
 *    reads their dist/
 * 5. unit tests: the feature's __tests__ (or the whole app) and the touched
 *    packages
 *
 * A step whose tools are not installed (mobile, where the native packages may
 * not install) is reported as skipped, never as passed. The summary lists both.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((arg, i, all) => (arg.startsWith('--') ? [arg.slice(2), all[i + 1]] : []))
    .filter((pair) => pair.length),
);

const APPS = {
  // flama:begin web
  web: { dir: 'apps/web', features: 'src/features', arch: ['src'], typecheck: true },
  // flama:end web
  // flama:begin mobile
  mobile: { dir: 'apps/mobile', features: 'features', arch: ['app', 'features', 'lib'] },
  // flama:end mobile
};

const app = APPS[args.app];
if (!app) {
  console.error(
    'usage: verify-feature.mjs --app <web|mobile> [--module <name>]',
  );
  process.exit(2);
}

const root = new URL('../../../../', import.meta.url).pathname.replace(/\/$/, '');
const results = [];

function run(label, command, commandArgs, cwd = root) {
  process.stdout.write(`\n▶ ${label}\n  $ ${[command, ...commandArgs].join(' ')}\n`);
  const result = spawnSync(command, commandArgs, { cwd, stdio: 'inherit', shell: false });
  const ok = result.status === 0;
  results.push({ label, status: ok ? 'passed' : 'FAILED' });
  if (!ok) finish(1);
}

function skip(label, reason) {
  process.stdout.write(`\n▷ ${label}: skipped (${reason})\n`);
  results.push({ label, status: `skipped: ${reason}` });
}

function finish(code) {
  console.log('\nSummary');
  for (const { label, status } of results) console.log(`  ${status.padEnd(9)} ${label}`);
  process.exit(code);
}

/** A package's own binary, if its dependencies are installed. */
function bin(dir, name) {
  const local = join(root, dir, 'node_modules/.bin', name);
  return existsSync(local) ? local : null;
}

/**
 * The frontend packages this change touches: the working tree against HEAD
 * (what you are about to commit) plus untracked files. `--base <ref>` widens it
 * to everything since that ref, for a branch with several commits.
 */
function touchedPackages() {
  const since = args.base ?? 'HEAD';
  const diff = spawnSync('git', ['diff', '--name-only', since], { cwd: root, encoding: 'utf8' });
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
  });
  const files = `${diff.stdout}\n${untracked.stdout}`.split('\n');
  const packages = new Set();
  for (const file of files) {
    const match = file.match(/^packages\/frontend\/(core|consumer|admin|web|mobile)\//);
    if (match) packages.add(`packages/frontend/${match[1]}`);
  }
  return [...packages];
}

if (!existsSync(join(root, app.dir))) {
  console.error(`${app.dir} does not exist in this project.`);
  process.exit(2);
}

const appInstalled = existsSync(join(root, app.dir, 'node_modules'));
const packages = touchedPackages();

// 1. structure
run('structure (pnpm check:structure)', 'node', ['scripts/check-frontend-structure.mjs']);
run('structure checker tests', 'node', ['--test', 'scripts/check-frontend-structure.test.mjs']);

// 2. dependency-cruiser
const depcruise = bin(app.dir, 'depcruise') ?? bin('packages/frontend/core', 'depcruise');
if (!depcruise) {
  skip('dependency-cruiser', 'not installed');
} else {
  run(`arch: ${app.dir}`, depcruise, [...app.arch, '--config', '.dependency-cruiser.cjs'], join(root, app.dir));
  for (const pkg of packages) {
    run(`arch: ${pkg}`, depcruise, ['src', '--config', '.dependency-cruiser.cjs'], join(root, pkg));
  }
}

// 3. Biome
const biome = bin('.', 'biome');
if (!biome) skip('biome', 'root dependencies not installed');
else run('biome', biome, ['check', app.dir, ...packages, 'e2e']);

// 4. typecheck
if (!app.typecheck) {
  skip('typecheck', `${args.app} has no typecheck step here`);
} else if (!appInstalled) {
  skip('typecheck', `${app.dir} dependencies not installed`);
} else {
  run('build workspace dependencies', 'pnpm', ['turbo', 'run', 'build', `--filter=@flama/${args.app}^...`]);
  run(`typecheck: ${app.dir}`, bin(app.dir, 'tsc') ?? 'tsc', ['-b'], join(root, app.dir));
}

// 5. unit tests
const vitest = bin(app.dir, 'vitest');
if (!vitest || !appInstalled) {
  skip(`tests: ${app.dir}`, 'vitest not installed for this app');
} else {
  const scope = args.module ? [join(app.features, args.module)] : [];
  run(`tests: ${app.dir}${args.module ? ` (${args.module})` : ''}`, vitest, ['run', '--passWithNoTests', ...scope], join(root, app.dir));
}
for (const pkg of packages) {
  const packageVitest = bin(pkg, 'vitest');
  if (!packageVitest) skip(`tests: ${pkg}`, 'not installed');
  else run(`tests: ${pkg}`, packageVitest, ['run'], join(root, pkg));
}

finish(0);
