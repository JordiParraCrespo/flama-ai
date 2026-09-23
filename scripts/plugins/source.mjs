/**
 * Where plugins come from, what a plugin declares, and whether a project can
 * take one.
 *
 * Kept apart from the installer so that reading a manifest does not mean
 * loading the code that writes one in: `pnpm starter:init` plans over every
 * plugin on offer before it touches anything, and needs exactly this.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Where plugins come from when `--from` is not given. */
export const DEFAULT_REPO = 'https://github.com/JordiParraCrespo/flama-ai-plugins.git';
export const DEFAULT_REF = 'main';

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(2);
}

/**
 * The scratch clone, if this run made one. Removed on exit rather than in a
 * `finally`, because `fail()` exits the process and would skip it.
 */
let scratch = null;
process.on('exit', () => {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
});

/**
 * A directory holding the plugins repository.
 *
 * `--from` names one that already exists; anything else is fetched. The path
 * resolves against the repo root, not the working directory, so `--from
 * ../flama-ai-plugins` means the same thing from `apps/api` as from the root.
 * An absolute path is unaffected, which is what the harnesses pass.
 */
export function resolveSource({ from, repo = DEFAULT_REPO, ref = DEFAULT_REF }) {
  if (from) {
    const dir = resolve(ROOT, from);
    if (!existsSync(dir)) fail(`--from ${from}: ${dir} does not exist`);
    return { dir, label: from };
  }
  scratch = mkdtempSync(join(tmpdir(), 'flama-plugins-'));
  // init + fetch rather than `clone --branch`, which takes a branch or a tag
  // but not a commit. This takes all three.
  try {
    execFileSync('git', ['init', '--quiet', scratch], { stdio: 'pipe' });
    execFileSync('git', ['-C', scratch, 'remote', 'add', 'origin', repo], { stdio: 'pipe' });
    execFileSync('git', ['-C', scratch, 'fetch', '--quiet', '--depth', '1', 'origin', ref], {
      stdio: 'pipe',
    });
    execFileSync('git', ['-C', scratch, 'checkout', '--quiet', 'FETCH_HEAD'], { stdio: 'pipe' });
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    fail(
      `could not fetch ${ref} from ${repo}\n${output}\n` +
        'If the machine is offline or the repository is private, clone it yourself ' +
        'and pass --from <path>.',
    );
  }
  const at = execFileSync('git', ['-C', scratch, 'rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  // Which commit, not just which ref: a branch moves, and what was installed
  // should be answerable later from the terminal scrollback alone.
  console.log(`Fetched ${repo} at ${ref} (${at}).`);
  return { dir: scratch, label: `${repo} at ${ref}` };
}

function pluginsDir(source) {
  const dir = join(source.dir, 'plugins');
  if (!existsSync(dir)) fail(`no plugins/ directory in ${source.label}`);
  return dir;
}

export function pluginIds(source) {
  return readdirSync(pluginsDir(source), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function loadPlugin(source, id) {
  const dir = join(pluginsDir(source), id);
  const manifestPath = join(dir, 'plugin.json');
  if (!existsSync(manifestPath)) {
    const available = pluginIds(source);
    fail(
      `no plugin "${id}" in ${source.label}` +
        (available.length ? ` — it has: ${available.join(', ')}` : ' — it has none'),
    );
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.id !== id) fail(`${manifestPath}: declares id "${manifest.id}", lives in ${id}/`);
  for (const field of ['feature', 'files']) {
    if (!manifest[field]) fail(`${manifestPath}: missing "${field}"`);
  }
  for (const field of ['identifiers', 'paths']) {
    if (!Array.isArray(manifest.feature[field])) {
      fail(`${manifestPath}: feature.${field} must be an array`);
    }
  }
  // `deleteKeys` was a shape with no inverse: it named a key without its
  // value, so an install silently did nothing. It is gone from the format,
  // and a manifest that still uses it is refused rather than half-applied.
  for (const edit of manifest.feature.json ?? []) {
    if (edit.deleteKeys) {
      fail(
        `${manifestPath}: ${edit.file} uses "deleteKeys", which a plugin cannot install — ` +
          'it names a key without its value. Use "set" so the edit runs in both directions.',
      );
    }
  }
  return { ...manifest, dir };
}

/**
 * Why a project cannot take this plugin, or an empty list when it can.
 *
 * The one rule, asked two ways: the planner asks it of the project a choice
 * would leave (`hasFeature` and `hasPath` answer for the would-be tree), the
 * installer of the project on disk. One predicate, so a plugin that grows a
 * new requirement cannot pass the plan and then fail the write.
 *
 * - Every feature it requires is there.
 * - Every shared package it builds on is there, or the plugin carries it. A
 *   shared path is joined, not brought: the mobile kits belong to whichever
 *   Expo apps remain, and a project that pruned the last of them has no kit.
 */
export function installProblems(manifest, { hasFeature, hasPath }) {
  const problems = [];
  for (const dep of manifest.feature.requires ?? []) {
    if (!hasFeature(dep)) problems.push(`"${manifest.id}" requires "${dep}", which is not here`);
  }
  const carried = new Set(Object.keys(manifest.sharedFiles ?? {}));
  const missing = (manifest.feature.shared ?? [])
    .map(({ path }) => path)
    .filter((path) => !carried.has(path) && !hasPath(path));
  if (missing.length) {
    problems.push(
      `"${manifest.id}" builds on ${missing.join(', ')}, which went with the last app that needed it`,
    );
  }
  return problems;
}
