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
 * plan, touch nothing), --force (overwrite paths that already exist),
 * --no-check (skip the closing `starter:check`, for a caller that installs
 * several and checks once).
 *
 * ## What a plugin carries
 *
 * A plugin is a `features.json` entry plus the three ops that put it in place.
 * Everything below is either the entry, a file to copy, or one of those ops:
 *
 *   {
 *     "id": "admin-web",
 *
 *     // The features.json entry, written verbatim on install and deleted by
 *     // the prune that removes it. `shared` joins a path's `neededBy` rather
 *     // than owning it; `json` declares what this feature owns in files that
 *     // cannot carry a marker, and is read backwards here (see below).
 *     "feature": {
 *       "title", "summary", "identifiers", "paths",
 *       "requires": ["<feature id>"],
 *       "scripts":  ["<package.json script>"],
 *       "shared":   [{ "path", "identifiers" }],
 *       "json":     [{ "file", "path", "remove", "at", "set", "setAt" }],
 *       //   A key is always declared with its value (`set`), so every edit
 *       //   runs both ways; `starter:check` keeps the value true to the file.
 *       "regenerate": ["generate:api-client", "generate:openapi"]
 *       //   The root scripts that rebuild the generated files this feature
 *       //   shapes — the OpenAPI document and the client — most complete
 *       //   first; the step is the first one the project has. They carry no
 *       //   markers, so neither direction edits them; both name the step.
 *     },
 *
 *     // Whole trees, copied. `filesNeed` marks one that belongs inside
 *     // another optional feature's tree and is skipped without it.
 *     "files":     { "<destination>": "<path inside the plugin>" },
 *     "filesNeed": { "<destination>": "<feature id>" },
 *
 *     // OP 1 — a block of text at an anchor. Inserted immediately above the
 *     // `flama:plugins <anchor>` comment, fenced with this plugin's id.
 *     "blocks":  [{ "file", "anchor", "source", "needs" }],
 *
 *     // OP 2 — this plugin joining a block several features share. The anchor
 *     // beside the block says which one; `order` is the canonical owner order
 *     // so two plugins agree on where each name goes. `source` is the block's
 *     // body, for a project that pruned its other owners and the block with
 *     // them: there it goes in as op 1, the plugin's own block.
 *     "coOwned": [{ "file", "anchor", "order", "source", "needs" }],
 *
 *     // A path carried in because every feature that needed it has left.
 *     "sharedFiles": { "<destination>": "<path inside the plugin>" }
 *   }
 *
 * OP 3 is the `json` list above, run backwards: what a prune removes, an
 * install puts back. There is no fourth. The ops are `ops.mjs`; reading a
 * plugin and deciding whether a project can take it is `source.mjs`; this
 * file is the command. Text goes through `markers.mjs` and JSON through
 * `json-text.mjs`, whose delete and insert come in pairs — that is what makes
 * an install and a removal exact inverses, and the round trip in the plugins
 * repo, into the full starter and into pruned projects, is what proves it.
 *
 * Copied files are trimmed with the prune's own edit (`dropBlocks`): they come
 * from a starter that had every feature, and arrive as the prune would have
 * left them in this one.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { regenerateSteps } from '../starter/prune.mjs';
import {
  applyJsonEdits,
  insertBlocks,
  joinShared,
  projectFeatures,
  trimCopied,
  writeFeature,
} from './ops.mjs';
import {
  DEFAULT_REF,
  DEFAULT_REPO,
  installProblems,
  loadPlugin,
  pluginIds,
  resolveSource,
} from './source.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/** Removal shells out here: `plugin:remove` is `prune.mjs --without <id>`. */
const PRUNE_PATH = join(ROOT, 'scripts', 'starter', 'prune.mjs');

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
// add
// ---------------------------------------------------------------------------

function add(manifest, options) {
  const { dryRun, force, check } = options;
  const features = projectFeatures();
  if (features[manifest.id]) {
    fail(`"${manifest.id}" is already a feature of this project — nothing to install`);
  }
  // The same rule `pnpm starter:init` plans with, asked of the disk.
  const problems = installProblems(manifest, {
    hasFeature: (id) => Boolean(features[id]),
    hasPath: (path) => existsSync(join(ROOT, path)),
  });
  if (problems.length) fail(`this project cannot take the plugin:\n  ${problems.join('\n  ')}`);

  // A file can belong inside another optional feature's tree — the CLI's docs
  // page lives under `apps/docs`. In a project without that feature there is
  // nowhere to put it and no site to read it, so it is skipped rather than
  // dropped into an empty directory.
  const absent = (destination) => {
    const dep = manifest.filesNeed?.[destination];
    return Boolean(dep) && !features[dep];
  };
  const destinations = Object.keys(manifest.files).filter((d) => !absent(d));
  for (const destination of destinations) {
    if (existsSync(join(ROOT, destination)) && !force) {
      fail(`${destination} already exists (pass --force to overwrite)`);
    }
  }
  // Only the paths that actually land are declared: the entry goes into
  // `features.json`, which the honesty check reads, and a path that was
  // skipped would read there as a file the project has lost.
  const paths = manifest.feature.paths.filter((path) => !absent(path));
  for (const path of paths) {
    if (
      !destinations.some((d) => path === d || path.startsWith(`${d}/`) || d.startsWith(`${path}/`))
    )
      fail(`${manifest.id}: feature path "${path}" is not covered by any entry in "files"`);
  }

  console.log(`\nInstalling ${manifest.id}: ${manifest.feature.summary}\n`);
  const copy = (destination, from, note = '') => {
    const source = join(manifest.dir, from);
    if (!existsSync(source)) fail(`${manifest.id}: "${from}" is missing from the plugin`);
    console.log(`  copy   ${destination}${note}`);
    if (dryRun) return;
    mkdirSync(dirname(join(ROOT, destination)), { recursive: true });
    cpSync(source, join(ROOT, destination), { recursive: true, verbatimSymlinks: true });
  };
  const sharedLanded = [];
  for (const [destination, from] of Object.entries(manifest.sharedFiles ?? {})) {
    if (existsSync(join(ROOT, destination))) {
      console.log(`  keep   ${destination} (already here for another feature)`);
      continue;
    }
    copy(destination, from, ' (shared)');
    sharedLanded.push(destination);
  }
  for (const [destination, from] of Object.entries(manifest.files)) {
    if (absent(destination)) {
      console.log(
        `  skip   ${destination} (no ${manifest.filesNeed[destination]} in this project)`,
      );
      continue;
    }
    copy(destination, from);
  }
  trimCopied(manifest, [...sharedLanded, ...destinations], features, dryRun);

  // Shared blocks first: putting one back can bring back the anchor an owned
  // block goes at — the bundle budgets step holds the control plane's slot.
  const joined = joinShared(manifest, features, dryRun);
  insertBlocks(manifest, joined, features, dryRun);
  applyJsonEdits(manifest, dryRun);
  writeFeature(manifest, paths, dryRun);

  if (dryRun) {
    console.log('\nDry run: nothing was changed.');
    return;
  }
  // The honesty check is the acceptance test: it re-reads the whole repo and
  // fails if the plugin left a mention of itself outside its own paths and
  // blocks. An install that passes it is indistinguishable from a feature
  // that shipped in the box.
  if (check) {
    console.log('\nChecking the manifest still describes the repo…');
    runPrune(['--check']);
  }
  console.log(`\nInstalled ${manifest.id}. Next: pnpm install${followUps(manifest)}`);
}

function followUps(manifest) {
  return regenerateSteps([manifest.feature])
    .map((step) => `, ${step}`)
    .join('');
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
  const features = projectFeatures();
  if (!features[id]?.plugin) {
    fail(
      features[id]
        ? `"${id}" ships with this starter; use pnpm starter:prune to drop it`
        : `"${id}" is not installed`,
    );
  }

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

  // Everything the install wrote — the paths, the fenced blocks, the manifest
  // entry, this plugin's name in any `neededBy` it joined — is what
  // `--without` already takes out. There is nothing left for the installer to
  // undo, which is the point of there being one catalog.
  const args = ['--without', id, '--no-install'];
  if (dryRun) args.push('--dry-run');
  runPrune(args);

  if (dryRun) {
    console.log('\nDry run: nothing was changed.');
    return;
  }
  runPrune(['--check']);
  console.log(`\nRemoved ${id}. Next: pnpm install${followUps({ feature: features[id] })}`);
}

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

function list(source) {
  const features = projectFeatures();
  const ids = pluginIds(source);
  if (!ids.length) {
    console.log(`No plugins in ${source.label}.`);
    return;
  }
  for (const id of ids) {
    const manifest = JSON.parse(
      readFileSync(join(source.dir, 'plugins', id, 'plugin.json'), 'utf8'),
    );
    const state = features[id]?.plugin ? 'installed' : '-';
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
    check: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--no-check') options.check = false;
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
