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
 *       "json":     [{ "file", "path", "remove", "at", "set", "setAt" }]
 *       //   `deleteKeys` is prune-only and rejected here: it names a key
 *       //   without its value, so no install could put it back.
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
 *     // so two plugins agree on where each name goes.
 *     "coOwned": [{ "file", "anchor", "order", "needs" }],
 *
 *     // A path carried in because every feature that needed it has left.
 *     "sharedFiles": { "<destination>": "<path inside the plugin>" },
 *
 *     "postInstall": ["pnpm generate:api-client"]
 *   }
 *
 * OP 3 is the `json` list above, run backwards: what a prune removes, an
 * install puts back. There is no fourth. Text goes through `markers.mjs`
 * (`widenMarker` is `narrowMarker`'s inverse) and JSON through
 * `json-text.mjs`, whose delete and insert come in pairs — that is what makes
 * an install and a removal exact inverses, and the round trip in the plugins
 * repo is what proves it.
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
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { insertJsonEntry, insertJsonValue, renderJsonEntry } from '../lib/json-text.mjs';
import {
  annotate,
  ANCHOR_RE,
  findAnchor,
  MARKER_RE,
  MarkerError,
  widenMarker,
} from '../lib/markers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const FEATURES_PATH = join(ROOT, 'scripts', 'starter', 'features.json');
/** Removal shells out here: `plugin:remove` is `prune.mjs --without <id>`. */
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
  // `deleteKeys` is the one `json` shape with no inverse — it names a key
  // whose value the starter owns, so the pruner can drop it and nothing can
  // put it back. That is right for a shipped feature and a trap for a plugin:
  // an install would silently do nothing and the key would never appear.
  // Better to say so here than to let a manifest look like it works.
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
 * The project's manifest: every optional feature it has, the starter's and the
 * installed alike.
 *
 * One catalog, which is why `scripts/starter` outlives a one-shot prune — the
 * pruner reads this file, and removal is the pruner. A plugin's entry is
 * written in here on install and taken out by the prune that removes it.
 */
function loadFeatures() {
  return JSON.parse(readFileSync(FEATURES_PATH, 'utf8'));
}

/** Every feature this project has. */
function allFeatures() {
  return loadFeatures().features;
}

/**
 * The manifest's feature entry, in `features.json` key order so an install
 * produces the same file a hand-written entry would.
 */
export function featureEntry(manifest, landed) {
  const { title, summary, identifiers, paths, requires, scripts, json } = manifest.feature;
  return {
    title,
    summary,
    // What tells the two apart now that they share a catalog: `starter:prune`
    // treats every feature alike, but `plugin:remove` only removes what a
    // plugin installed, and `plugin:list` only calls those installed.
    plugin: true,
    identifiers,
    // The paths that actually landed, which is all of them unless a file was
    // skipped for want of the feature whose tree it lives in.
    paths: landed ?? paths,
    ...(requires?.length ? { requires } : {}),
    ...(scripts?.length ? { scripts } : {}),
    ...(json?.length ? { json } : {}),
  };
}

/**
 * Write the plugin's entry into `features.json`, in the file's own style.
 *
 * The entry is rendered from the object the plugin declares rather than pasted
 * from a stored blob, so an installed feature reads exactly like one that
 * shipped — and the prune that removes it deletes the lines this added, which
 * is what keeps the file byte-identical across an install and a remove.
 *
 * A shared path is not owned, it is *joined*: the design system belongs to
 * whichever apps remain, so a plugin appends itself to `neededBy` and the
 * prune takes it back out. The exception is a path whose every dependant was
 * optional and left together — the control plane's domain package belongs to
 * both admin apps and nothing else — and then there is no entry to join, so
 * the plugin carries one.
 */
function writeFeature(manifest, landed, dryRun) {
  console.log(`  edit   ${relative(ROOT, FEATURES_PATH)} (+${manifest.id})`);
  const original = readFileSync(FEATURES_PATH, 'utf8');
  let text = original;

  const entry = featureEntry(manifest, landed);
  if (loadFeatures().features[manifest.id]) {
    fail(`"${manifest.id}" is already a feature of this project — nothing to install`);
  }
  const inserted = insertJsonEntry(text, ['features'], renderJsonEntry(manifest.id, entry, 2));
  if (inserted === null) fail('features.json: no "features" object to add the entry to');
  text = inserted;

  for (const shared of manifest.feature.shared ?? []) {
    const current = JSON.parse(text).shared[shared.path];
    if (current) {
      if (current.neededBy.includes(manifest.id)) continue;
      const next = insertJsonValue(
        text,
        ['shared', shared.path, 'neededBy'],
        manifest.id,
        current.neededBy.length,
      );
      if (next === null) fail(`features.json: cannot join shared "${shared.path}"`);
      text = next;
      continue;
    }
    const carried = { identifiers: shared.identifiers ?? [], neededBy: [manifest.id] };
    const next = insertJsonEntry(text, ['shared'], renderJsonEntry(shared.path, carried, 2));
    if (next === null) fail('features.json: no "shared" object to carry an entry into');
    text = next;
  }

  // Parsing it back is the cheap half of the check; `--check` is the rest.
  try {
    JSON.parse(text);
  } catch (error) {
    fail(`features.json: the entry did not produce valid JSON (${error.message})`);
  }
  if (!dryRun) writeFileSync(FEATURES_PATH, text);
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

/**
 * Apply the plugin's manifest-declared JSON edits, backwards.
 *
 * A feature declares the JSON it is responsible for — a turbo env
 * pass-through, a biome ignore, a pnpm override, a package script — and the
 * pruner takes those out when the feature goes. Installing is the same
 * declaration read the other way: `remove` becomes what goes back, and `at`
 * says where, because unlike a line of text a position in an array is
 * addressable and needs no anchor.
 *
 * That is the whole of it. The installer used to carry a second model for
 * this, storing a block of JSON text plus the exact line it had to follow, on
 * the grounds that JSON holds no comments and so no anchors. It does not need
 * one: the edit was always declared, and a declaration runs in both
 * directions.
 */
function applyJsonEdits(manifest, dryRun) {
  for (const edit of manifest.feature.json ?? []) {
    const target = join(ROOT, edit.file);
    if (!existsSync(target)) {
      if (edit.needs) {
        console.log(`  skip   ${edit.file} (no ${edit.needs} in this project)`);
        continue;
      }
      fail(`${edit.file} does not exist; cannot apply a JSON edit`);
    }
    const original = readFileSync(target, 'utf8');
    let text = original;

    // Array values go back at the index the removal recorded. `at` is
    // optional: without it a value is appended, which is always valid JSON and
    // is what a hand-written starter edit — one the pruner reads and the
    // installer never sees — leaves unstated.
    for (const [index, value] of (edit.remove ?? []).entries()) {
      const next = insertJsonValue(text, edit.path, value, edit.at?.[index]);
      if (next === null) {
        fail(`${edit.file}: cannot put "${value}" back into ${edit.path.join(' → ')}`);
      }
      text = next;
    }
    // Object keys go back as entries, rendered in the file's own style, at the
    // positions `setAt` records. A separate field from `at` on purpose: one
    // index list shared between an array of values and an object of keys would
    // have the two reading each other's positions, which nothing in the shape
    // would catch.
    for (const [index, [key, value]] of Object.entries(edit.set ?? {}).entries()) {
      const rendered = renderJsonEntry(key, value, edit.path.length + 1);
      const next = insertJsonEntry(text, edit.path, rendered, edit.setAt?.[index]);
      if (next === null) {
        fail(`${edit.file}: cannot put "${key}" back into ${edit.path.join(' → ')}`);
      }
      text = next;
    }
    if (text === original) continue;
    try {
      JSON.parse(text);
    } catch (error) {
      fail(`${edit.file}: the edit did not produce valid JSON (${error.message})`);
    }
    console.log(`  edit   ${edit.file}`);
    if (!dryRun) writeFileSync(target, text);
  }
}

/**
 * Whether the file already holds a block this plugin owns.
 *
 * Through the marker grammar, not `includes('flama:begin <id>')`: a substring
 * test says yes to `flama:begin widget-showcase` when asked about `widget`,
 * which is the confusion `checkFences` was written to stop.
 */
function carriesBlock(content, id) {
  return content
    .split('\n')
    .some((line) => MARKER_RE.exec(line)?.[2].split('|').includes(id));
}

function insertBlocks(manifest, dryRun) {
  const touched = [];
  for (const block of manifest.blocks ?? []) {
    const target = join(ROOT, block.file);
    if (!existsSync(target)) {
      // A block whose file belongs to another optional feature has nothing to
      // say in a project without it: the CLI's sidebar entry needs a docs site
      // to sit in. Skip it and say so. With no `needs` the file is one this
      // starter should have, so its absence means an anchor moved, and
      // refusing is the only honest answer.
      if (block.needs) {
        console.log(`  skip   ${block.file} (no ${block.needs} in this project)`);
        continue;
      }
      fail(`${block.file} does not exist; cannot place "${block.anchor}"`);
    }
    const content = readFileSync(target, 'utf8');

    // A feature can own several blocks in one file, each at its own anchor —
    // `helm/values.yaml` holds one per app it deploys. The guard below refuses
    // a file that already carries this plugin, so it has to mean "carried one
    // before this run started": once the first block is written the file does
    // carry one, and refusing on that would make the second block unplaceable.
    if (!touched.includes(block.file) && carriesBlock(content, manifest.id)) {
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
    if (!touched.includes(block.file)) touched.push(block.file);
  }
  return touched;
}

/**
 * Add this plugin to the owners of a block it shares.
 *
 * A co-owned block belongs to several features at once and goes only when the
 * last of them does — the design-system linter runs over every frontend app,
 * so the block stays while any remains and the pruner narrows its spec.
 * Installing is that edit backwards, and it is the same edit: `narrowMarker`
 * and `widenMarker` are neighbours in the grammar, and `annotate` already
 * knows how blocks nest, so nothing here counts marker depth.
 *
 * The block is named by the anchor beside it, never by its contents. Matching
 * on contents made the starter's prose part of the plugin format: taking a
 * departed app's name out of an `.env.example` header broke every co-owned
 * install, because the stored copy no longer matched.
 */
function widenCoOwned(manifest, dryRun) {
  for (const block of manifest.coOwned ?? []) {
    const target = join(ROOT, block.file);
    if (!existsSync(target)) {
      if (block.needs) {
        console.log(`  skip   ${block.file} shared block (no ${block.needs} in this project)`);
        continue;
      }
      fail(`${block.file} does not exist; cannot widen a shared block`);
    }

    const content = readFileSync(target, 'utf8');
    const found = findAnchor(block.file, content, block.anchor);
    if (!found) {
      fail(`${block.file}: no "flama:plugins ${block.anchor}" anchor to widen a block at`);
    }

    // Upwards from the anchor to the block it marks, stepping over any other
    // anchors that have gathered beside it. `annotate` has already paired the
    // fences and would have thrown on an imbalance, so the stack on that line
    // is the block, and its `begin` is where the other fence sits.
    const lines = annotate(block.file, content);
    let closing = null;
    for (let i = found.index - 1; i >= 0; i--) {
      if (ANCHOR_RE.test(lines[i].line) || !lines[i].line.trim()) continue;
      if (lines[i].marker && MARKER_RE.exec(lines[i].line)?.[1] === 'end') closing = i;
      break;
    }
    if (closing === null) {
      // Every owner left, so the pruner took the block and left the anchor.
      // Nothing to widen, and nothing here knows what the block said.
      fail(
        `${block.file}: the block above "flama:plugins ${block.anchor}" is gone, so there is ` +
          `nothing for "${manifest.id}" to join. It went with the last feature that owned it.`,
      );
    }
    const { ids, begin } = lines[closing].stack.at(-1);
    if (ids.includes(manifest.id)) {
      fail(`${block.file}: the shared block already names "${manifest.id}"`);
    }

    // Insert after the last owner this plugin knows comes before it, rather
    // than rebuilding the spec from its own order: another plugin installed
    // earlier may have added an owner this one has never heard of, and
    // rebuilding would silently drop it.
    const order = block.order ?? ids;
    const before = order.slice(0, order.indexOf(manifest.id));
    const at = ids.filter((owner) => before.includes(owner)).length;
    console.log(
      `  widen  ${block.file} (${ids.join('|')} → ${[...ids.slice(0, at), manifest.id, ...ids.slice(at)].join('|')})`,
    );
    if (dryRun) continue;
    const out = lines.map((entry) => entry.line);
    out[begin - 1] = widenMarker(out[begin - 1], manifest.id, at);
    out[closing] = widenMarker(out[closing], manifest.id, at);
    writeFileSync(target, out.join('\n'));
  }
}

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
  for (const [destination, from] of Object.entries(manifest.sharedFiles ?? {})) {
    if (existsSync(join(ROOT, destination))) {
      console.log(`  keep   ${destination} (already here for another feature)`);
      continue;
    }
    const source = join(manifest.dir, from);
    if (!existsSync(source)) fail(`${manifest.id}: shared "${from}" is missing from the plugin`);
    console.log(`  copy   ${destination} (shared)`);
    if (!dryRun) {
      mkdirSync(dirname(join(ROOT, destination)), { recursive: true });
      cpSync(source, join(ROOT, destination), { recursive: true, verbatimSymlinks: true });
    }
  }
  for (const [destination, from] of Object.entries(manifest.files)) {
    if (absent(destination)) {
      console.log(`  skip   ${destination} (no ${manifest.filesNeed[destination]} in this project)`);
      continue;
    }
    const source = join(manifest.dir, from);
    if (!existsSync(source)) fail(`${manifest.id}: "${from}" is missing from the plugin`);
    console.log(`  copy   ${destination}`);
    if (!dryRun) {
      mkdirSync(dirname(join(ROOT, destination)), { recursive: true });
      cpSync(source, join(ROOT, destination), { recursive: true, verbatimSymlinks: true });
    }
  }

  insertBlocks(manifest, dryRun);
  applyJsonEdits(manifest, dryRun);
  widenCoOwned(manifest, dryRun);

  writeFeature(manifest, paths, dryRun);

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
  const features = allFeatures();
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
  console.log(`\nRemoved ${id}. Next: pnpm install`);
}

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

function list(source) {
  const features = allFeatures();
  const dir = pluginsDir(source);
  const ids = pluginIds(source);
  if (!ids.length) {
    console.log(`No plugins in ${source.label}.`);
    return;
  }
  for (const id of ids) {
    const manifest = JSON.parse(readFileSync(join(dir, id, 'plugin.json'), 'utf8'));
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
