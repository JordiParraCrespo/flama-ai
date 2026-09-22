#!/usr/bin/env node
/**
 * Install and remove Flama plugins.
 *
 * A plugin is the inverse of a starter feature. The starter ships every app it
 * knows how to build and `scripts/starter/prune.mjs` removes what a project
 * does not want; a plugin is something the starter does *not* ship, which this
 * script adds. Both speak the same manifest and the same marker language, so
 * an installed plugin is indistinguishable from a feature that shipped in the
 * box — which is what makes removal free: `plugin:remove` is `prune.mjs`.
 *
 *   node scripts/plugins/plugin.mjs add cli
 *   node scripts/plugins/plugin.mjs remove cli
 *   node scripts/plugins/plugin.mjs list
 *
 * The plugins live in their own repository, so by default the source is
 * fetched: a depth-1 clone into a temporary directory, thrown away when the
 * command ends. A project generated from this starter has no checkout of that
 * repository beside it, and nothing here assumes what sits next to a project
 * on disk.
 *
 * Flags: --ref <branch|tag|sha> (what to fetch, default main), --repo <url>
 * (fetch from a fork), --from <path> (a checkout that already exists — the
 * offline path, and how the plugins repo tests itself), --dry-run (print the
 * plan, touch nothing), --force (overwrite paths that already exist).
 *
 * ## What a plugin carries
 *
 * `plugin.json` holds the `features.json` entry the plugin becomes once
 * installed, the files to copy, and the blocks to insert:
 *
 *   {
 *     "id": "cli",
 *     "feature": { "title", "summary", "identifiers", "paths", "requires" },
 *     "files":  { "<destination path>": "<path inside the plugin>" },
 *     "blocks": [{ "file", "anchor", "source" }]
 *   }
 *
 * Files are copied whole. Blocks are inserted immediately above their
 * `flama:plugins <anchor>` comment, wrapped in `flama:begin <id>` /
 * `flama:end <id>` so the pruner owns them from that moment on. The feature
 * entry is merged into `features.json`, which is what makes the install
 * visible to `pnpm starter:check` and removable by `pnpm starter:prune`.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findAnchor, MarkerError, narrowMarker } from '../lib/markers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const FEATURES_PATH = join(ROOT, 'scripts', 'starter', 'features.json');
/**
 * What this script installed. Separate from `features.json` because that file
 * is the starter's own and a project owns its formatting; rewriting it on
 * every install would churn it. `prune.mjs` merges this one at load, so an
 * installed plugin is a feature in every way that matters.
 */
const INSTALLED_PATH = join(ROOT, '.flama-plugins.json');
const PRUNE_PATH = join(ROOT, 'scripts', 'starter', 'prune.mjs');
/** Where plugins come from when `--from` is not given. */
const DEFAULT_REPO = 'https://github.com/JordiParraCrespo/flama-ai-plugins.git';
const DEFAULT_REF = 'main';

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(2);
}

/**
 * Run the pruner and surface what it said. `stdio: 'inherit'` loses the
 * message whenever this script is itself captured — which is exactly how the
 * round-trip harness runs it, and exactly when the message matters.
 */
function runPrune(args) {
  try {
    const out = execFileSync('node', [PRUNE_PATH, ...args], { cwd: ROOT, encoding: 'utf8' });
    if (out.trim()) console.log(out.trimEnd());
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    fail(`prune.mjs ${args.join(' ')} failed:\n${output}`);
  }
}

// ---------------------------------------------------------------------------
// Where the plugins come from
// ---------------------------------------------------------------------------

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
 * ../flama-ai-plugins` means the same thing from `apps/api` as from the root —
 * every other path in this script is already root-relative. An absolute path
 * is unaffected, which is what the round-trip harness passes.
 */
function resolveSource({ from, repo, ref }) {
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

// ---------------------------------------------------------------------------
// Manifests
// ---------------------------------------------------------------------------

function pluginsDir(source) {
  const dir = join(source.dir, 'plugins');
  if (!existsSync(dir)) fail(`no plugins/ directory in ${source.label}`);
  return dir;
}

function pluginIds(source) {
  return readdirSync(pluginsDir(source), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function loadPlugin(source, id) {
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
  return { ...manifest, dir };
}

function loadFeatures() {
  return JSON.parse(readFileSync(FEATURES_PATH, 'utf8'));
}

function loadInstalled() {
  if (!existsSync(INSTALLED_PATH)) return { features: {}, shared: {} };
  const installed = JSON.parse(readFileSync(INSTALLED_PATH, 'utf8'));
  return { features: installed.features ?? {}, shared: installed.shared ?? {} };
}

function writeInstalled(installed, dryRun) {
  if (dryRun) return;
  if (!Object.keys(installed.features).length) {
    if (existsSync(INSTALLED_PATH)) rmSync(INSTALLED_PATH);
    return;
  }
  writeFileSync(INSTALLED_PATH, `${JSON.stringify(installed, null, 2)}\n`);
}

/** Every feature this project has: the starter's, plus what was installed. */
function allFeatures() {
  return { ...loadFeatures().features, ...loadInstalled().features };
}

/**
 * The manifest's feature entry, in `features.json` key order so an install
 * produces the same file a hand-written entry would.
 */
export function featureEntry(manifest) {
  const { title, summary, identifiers, paths, requires, scripts, json } = manifest.feature;
  return {
    title,
    summary,
    identifiers,
    paths,
    ...(requires?.length ? { requires } : {}),
    ...(scripts?.length ? { scripts } : {}),
    ...(json?.length ? { json } : {}),
  };
}

/**
 * The `shared` entries in `features.json` that name this plugin.
 *
 * A shared path — `apps/docs/docs/tooling/permissions.md`, the design system —
 * belongs to no single feature and survives while any dependant remains. A
 * plugin therefore does not own those paths; it owns its *membership* of
 * their `neededBy` lists, and installing or removing it edits those lists.
 * Leave one stale and `starter:check` fails on a feature that no longer
 * exists, which is how this was found.
 */
function joinShared(installed, manifest) {
  for (const entry of manifest.feature.shared ?? []) {
    const dependants = installed.shared[entry.path] ?? [];
    if (!dependants.includes(manifest.id)) dependants.push(manifest.id);
    installed.shared[entry.path] = dependants;
  }
}

function leaveShared(installed, id) {
  for (const [path, dependants] of Object.entries(installed.shared)) {
    const rest = dependants.filter((dependant) => dependant !== id);
    if (rest.length) installed.shared[path] = rest;
    else delete installed.shared[path];
  }
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/**
 * A block is inserted verbatim, exactly as the plugin stores it, immediately
 * above its anchor line.
 *
 * Verbatim rather than rendered: the plugin carries its own fences, comment
 * syntax and indentation, because those are properties of the file it lands
 * in — `#` in `.env.example`, `//` indented eight spaces inside a TypeScript
 * array. Reconstructing them here would mean guessing, and guessing wrong is
 * a diff that looks like the plugin edited code it does not own.
 *
 * The fences are checked, not generated: a block that does not name its
 * plugin would be invisible to the pruner, and removal would silently leave
 * it behind.
 */
export function checkFences(id, file, body) {
  for (const kind of ['begin', 'end']) {
    // Membership of the pipe-separated spec, not a substring match: `-` is a
    // word boundary, so a `\\bwidget\\b` test happily accepts a fence that
    // actually reads `widget-showcase`.
    const specs = [...body.matchAll(new RegExp(`flama:${kind}\\s+([\\w|-]+)`, 'g'))];
    if (!specs.some(([, spec]) => spec.split('|').includes(id))) {
      return `block for ${file} has no "flama:${kind} ${id}" fence — the pruner could never remove it`;
    }
  }
  return null;
}

function insertBlocks(manifest, dryRun) {
  const touched = [];
  for (const block of manifest.blocks ?? []) {
    const target = join(ROOT, block.file);
    if (!existsSync(target)) fail(`${block.file} does not exist; cannot place "${block.anchor}"`);
    const content = readFileSync(target, 'utf8');

    if (content.includes(`flama:begin ${manifest.id}`)) {
      fail(`${block.file} already carries a "${manifest.id}" block`);
    }
    let anchor;
    try {
      anchor = findAnchor(block.file, content, block.anchor);
    } catch (error) {
      if (error instanceof MarkerError) fail(error.message);
      throw error;
    }
    if (!anchor) {
      fail(
        `${block.file} has no "flama:plugins ${block.anchor}" anchor — the insertion point is gone`,
      );
    }

    const source = join(manifest.dir, block.source);
    if (!existsSync(source)) fail(`${manifest.id}: block source "${block.source}" is missing`);
    const body = readFileSync(source, 'utf8').replace(/\n$/, '');
    const problem = checkFences(manifest.id, block.file, body);
    if (problem) fail(`${manifest.id}: ${problem}`);

    const lines = content.split('\n');
    lines.splice(anchor.index, 0, body);
    console.log(`  block  ${block.file} (above flama:plugins ${block.anchor})`);
    if (!dryRun) writeFileSync(target, lines.join('\n'));
    touched.push(block.file);
  }
  return touched;
}

/**
 * Widen the blocks this plugin co-owns with features that stayed behind.
 *
 * A `flama:begin mcp|cli` block belongs to the pair. When `cli` left, the
 * pruner narrowed the spec to `mcp` and the block stayed; installing puts the
 * name back. The plugin stores only the widened form — the narrowed one is
 * derived here by taking this plugin's own id back out of the fences, which
 * is the same transformation the pruner applied.
 *
 * Matching is on the whole block, not the fence: a narrowed `flama:begin mcp`
 * is textually identical to an mcp-only block's fence, and only the body
 * tells them apart. Which is why this runs *after* the anchored blocks are
 * inserted — in `sidebars.ts` the co-owned category encloses this plugin's
 * own entry, so the body is only complete once that entry is back.
 */
function widenCoOwned(manifest, dryRun) {
  for (const block of manifest.coOwned ?? []) {
    const target = join(ROOT, block.file);
    if (!existsSync(target)) fail(`${block.file} does not exist; cannot widen a shared block`);
    const source = join(manifest.dir, block.source);
    if (!existsSync(source)) fail(`${manifest.id}: shared block "${block.source}" is missing`);

    const widened = readFileSync(source, 'utf8').replace(/\n$/, '');
    const mine = new Set([manifest.id]);
    const narrowed = widened
      .split('\n')
      .map((line) => narrowMarker(line, mine))
      .join('\n');
    if (narrowed === widened) {
      fail(`${manifest.id}: shared block for ${block.file} does not name "${manifest.id}"`);
    }

    const content = readFileSync(target, 'utf8');
    const occurrences = content.split(narrowed).length - 1;
    if (occurrences !== 1) {
      fail(
        `${block.file}: found ${occurrences} copies of the shared block to widen; expected exactly one`,
      );
    }
    console.log(`  widen  ${block.file} (shared block)`);
    if (!dryRun) writeFileSync(target, content.replace(narrowed, widened));
  }
}

// ---------------------------------------------------------------------------
// add
// ---------------------------------------------------------------------------

function add(manifest, options) {
  const { dryRun, force } = options;
  const features = allFeatures();
  if (features[manifest.id]) {
    fail(`"${manifest.id}" is already a feature of this project — nothing to install`);
  }
  for (const dep of manifest.feature.requires ?? []) {
    if (!features[dep]) {
      fail(`"${manifest.id}" requires "${dep}", which this project does not have`);
    }
  }

  const destinations = Object.keys(manifest.files);
  for (const destination of destinations) {
    if (existsSync(join(ROOT, destination)) && !force) {
      fail(`${destination} already exists (pass --force to overwrite)`);
    }
  }
  for (const path of manifest.feature.paths) {
    if (
      !destinations.some((d) => path === d || path.startsWith(`${d}/`) || d.startsWith(`${path}/`))
    )
      fail(`${manifest.id}: feature path "${path}" is not covered by any entry in "files"`);
  }

  console.log(`\nInstalling ${manifest.id}: ${manifest.feature.summary}\n`);
  for (const [destination, from] of Object.entries(manifest.files)) {
    const source = join(manifest.dir, from);
    if (!existsSync(source)) fail(`${manifest.id}: "${from}" is missing from the plugin`);
    console.log(`  copy   ${destination}`);
    if (!dryRun) {
      mkdirSync(dirname(join(ROOT, destination)), { recursive: true });
      cpSync(source, join(ROOT, destination), { recursive: true, verbatimSymlinks: true });
    }
  }

  insertBlocks(manifest, dryRun);
  if (!dryRun) widenCoOwned(manifest, dryRun);

  console.log(`  edit   .flama-plugins.json (+${manifest.id})`);
  const installed = loadInstalled();
  installed.features[manifest.id] = featureEntry(manifest);
  joinShared(installed, manifest);
  writeInstalled(installed, dryRun);

  if (dryRun) {
    console.log('\nDry run: nothing was changed.');
    return;
  }
  // The honesty check is the acceptance test: it re-reads the whole repo and
  // fails if the plugin left a mention of itself outside its own paths and
  // blocks. An install that passes it is indistinguishable from a feature
  // that shipped in the box.
  console.log('\nChecking the manifest still describes the repo…');
  runPrune(['--check']);
  console.log(`\nInstalled ${manifest.id}. Next: pnpm install${followUps(manifest)}`);
}

function followUps(manifest) {
  return (manifest.postInstall ?? []).map((step) => `, ${step}`).join('');
}

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

/**
 * Removal is the pruner. The install left a feature entry and marker-fenced
 * blocks, which is exactly what `prune.mjs --without` already knows how to
 * take out — so there is no second implementation to keep in step, and the
 * uninstall path is as tested as the prune path.
 */
function remove(id, options) {
  const { dryRun } = options;
  const installed = loadInstalled();
  if (!installed.features[id]) {
    fail(
      loadFeatures().features[id]
        ? `"${id}" ships with this starter; use pnpm starter:prune to drop it`
        : `"${id}" is not installed`,
    );
  }
  const features = allFeatures();

  // A feature that requires this one would be pruned along with it, which is
  // a bigger change than uninstalling a plugin. `starter:prune` is the tool
  // for that, and it should be a deliberate choice.
  const dependants = Object.entries(features)
    .filter(([, feature]) => (feature.requires ?? []).includes(id))
    .map(([dependant]) => dependant);
  if (dependants.length) {
    fail(
      `"${id}" is required by ${dependants.join(', ')}; remove those first, or use starter:prune`,
    );
  }

  const args = [PRUNE_PATH, '--without', id, '--keep-tooling', '--no-install'];
  if (dryRun) args.push('--dry-run');
  runPrune(args.slice(1));

  // `prune.mjs` removes what a feature owns but never edits its own manifest —
  // a one-shot prune deletes it outright instead. Here it has to survive, so
  // the entry goes now, or `--check` would report a feature whose paths are
  // gone.
  console.log(`  edit   .flama-plugins.json (-${id})`);
  delete installed.features[id];
  leaveShared(installed, id);
  writeInstalled(installed, dryRun);
  if (dryRun) {
    console.log('\nDry run: nothing was changed.');
    return;
  }
  runPrune(['--check']);
  console.log(`\nRemoved ${id}. Next: pnpm install`);
}

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

function list(source) {
  const installed = loadInstalled().features;
  const dir = pluginsDir(source);
  const ids = pluginIds(source);
  if (!ids.length) {
    console.log(`No plugins in ${source.label}.`);
    return;
  }
  for (const id of ids) {
    const manifest = JSON.parse(readFileSync(join(dir, id, 'plugin.json'), 'utf8'));
    const state = installed[id] ? 'installed' : '-';
    console.log(`${id.padEnd(16)} ${state.padEnd(10)} ${manifest.feature?.summary ?? ''}`);
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE =
  'usage: plugin.mjs <add|remove|list> [<id>] [--from <path>] [--ref <git-ref>] [--repo <url>]';

const VALUE_FLAGS = { '--from': 'from', '--ref': 'ref', '--repo': 'repo' };

export function parseArgs(argv) {
  const options = {
    command: null,
    id: null,
    from: null,
    repo: DEFAULT_REPO,
    ref: DEFAULT_REF,
    dryRun: false,
    force: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else if (VALUE_FLAGS[arg]) {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) fail(`${arg} needs a value`);
      options[VALUE_FLAGS[arg]] = next;
      i += 1;
    } else if (arg.startsWith('--')) fail(`unknown argument ${arg}`);
    else if (!options.command) options.command = arg;
    else if (!options.id) options.id = arg;
    else fail(`unexpected argument ${arg}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  // `remove` is the pruner and reads nothing from the plugins repo, so it
  // never fetches — uninstalling works offline and after the source is gone.
  if (options.command === 'remove') {
    if (!options.id) fail(USAGE);
    return remove(options.id, options);
  }
  if (options.command === 'list') return list(resolveSource(options));
  if (options.command === 'add') {
    if (!options.id) fail(USAGE);
    return add(loadPlugin(resolveSource(options), options.id), options);
  }
  fail(USAGE);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
