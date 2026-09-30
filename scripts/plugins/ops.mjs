/**
 * What an install writes, one function per op.
 *
 * A plugin is a `features.json` entry plus three ops that put it in place:
 *
 *   1. a block at an anchor, owned by the plugin (`insertBlocks`);
 *   2. the plugin joining a block several features share (`joinShared`) —
 *      widening its fence, or, when every other owner was pruned and the
 *      block went with them, op 1 with the body the plugin carries for that;
 *   3. the entry's own `json` edits, run backwards (`applyJsonEdits`).
 *
 * A feature the starter still ships has no anchors of its own: its fences are
 * the only mark it leaves, and they are what comes back. The plugin carries
 * the starter's copy of each file it has a block in, and `replaySnapshots`
 * merges the blocks onto the project's copy — op 1 without the slot. A file
 * a feature replaces comes back the same way: its version is the starter's
 * with the feature's blocks in, and the prune took those out whole.
 *
 * Plus the prune's own edit over what it copies (`trimCopied`), because a
 * plugin's files come from a starter that had every feature. Every read of a
 * marker goes through `scripts/lib/markers.mjs` and every JSON edit through
 * `scripts/lib/json-text.mjs`, whose deletes and inserts come in pairs, so a
 * removal — which is the pruner — is an install backwards.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { insertJsonEntry, insertJsonValue, renderJsonEntry } from '../lib/json-text.mjs';
import {
  blockAbove,
  dropBlocks,
  findAnchor,
  hasFilledBlock,
  MarkerError,
  markerIds,
  slotsOf,
  widenMarker,
} from '../lib/markers.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FEATURES_PATH = join(ROOT, 'scripts', 'starter', 'features.json');

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(2);
}

/** A grammar call, with a malformed marker reported and the process ended. */
function grammar(read) {
  try {
    return read();
  } catch (error) {
    if (error instanceof MarkerError) fail(error.message);
    throw error;
  }
}

/**
 * The files this run has written, as it has written them. A dry run writes
 * nothing to disk, so without this an op that depends on an earlier one — an
 * owned block whose anchor sits inside a shared block just put back — would
 * read the old file and fail where the real install succeeds.
 */
const pending = new Map();

function readText(file) {
  return pending.get(file) ?? readFileSync(join(ROOT, file), 'utf8');
}

function writeText(file, text, dryRun) {
  pending.set(file, text);
  if (!dryRun) writeFileSync(join(ROOT, file), text);
}

/** Every feature this project has, shipped and installed alike. */
export function projectFeatures() {
  return JSON.parse(readFileSync(FEATURES_PATH, 'utf8')).features;
}

// ---------------------------------------------------------------------------
// The entry
// ---------------------------------------------------------------------------

/**
 * The manifest's feature entry, in `features.json` key order so an install
 * produces the same file a hand-written entry would.
 */
export function featureEntry(manifest, landed, slots = {}, replaced = manifest.feature.replaces) {
  const { title, summary, identifiers, paths, keeps, requires, scripts, json, regenerate } =
    manifest.feature;
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
    // Where the install put a block in whole, rather than into the fences a
    // prune left: those are the blocks its removal takes out whole too.
    slots,
    // The files it replaced, which its removal gives back to the starter's
    // version: the ones this project has.
    ...(replaced?.length ? { replaces: replaced } : {}),
    ...(keeps ? { keeps } : {}),
    ...(requires?.length ? { requires } : {}),
    ...(scripts?.length ? { scripts } : {}),
    ...(json?.length ? { json } : {}),
    ...(regenerate?.length ? { regenerate } : {}),
  };
}

/**
 * Write the plugin's entry into `features.json`, in the file's own style.
 *
 * Rendered from the object the plugin declares rather than pasted from a
 * stored blob, so an installed feature reads exactly like one that shipped —
 * and the prune that removes it deletes the lines this added, which keeps the
 * file byte-identical across an install and a remove.
 *
 * A shared path is not owned, it is *joined*: the design system belongs to
 * whichever apps remain, so a plugin appends itself to `neededBy` and the
 * prune takes it back out. The exception is a path whose every dependant was
 * optional and left together — the control plane's domain package belongs to
 * both admin apps and nothing else — and then the plugin carries the entry.
 */
export function writeFeature(manifest, landed, slots, dryRun) {
  console.log(`  edit   ${relative(ROOT, FEATURES_PATH)} (+${manifest.id})`);
  let text = readFileSync(FEATURES_PATH, 'utf8');
  if (JSON.parse(text).features[manifest.id]) {
    fail(`"${manifest.id}" is already a feature of this project — nothing to install`);
  }
  const replaced = manifest.feature.replaces?.filter((file) => existsSync(join(ROOT, file)));
  const entry = featureEntry(manifest, landed, slots, replaced);
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

/** The files the plugin's text ops can write a block into. */
function blockFiles(manifest) {
  return [
    ...new Set(
      [...(manifest.blocks ?? []), ...(manifest.coOwned ?? []), ...(manifest.snapshots ?? [])]
        .map((block) => block.file)
        .filter((file) => existsSync(join(ROOT, file))),
    ),
  ];
}

/**
 * The slots a block of this plugin already sits on, before it is installed:
 * the empty fences a prune left. Filling one is not a placement.
 */
export function slotsBefore(manifest) {
  return new Map(
    blockFiles(manifest).map((file) => [
      file,
      grammar(() => slotsOf(file, readText(file), manifest.id)),
    ]),
  );
}

/**
 * Where the install put a block in whole: a slot a block of this plugin sits
 * on now and did not before. The entry records them (`slots`), which is how
 * the prune that removes the plugin knows to take those blocks out whole and
 * leave its other fences, as the starter's own entries declare theirs.
 */
export function placedSlots(manifest, before) {
  const placed = {};
  for (const file of blockFiles(manifest).sort()) {
    const now = grammar(() => slotsOf(file, readText(file), manifest.id));
    const added = [...now].filter((slot) => !before.get(file)?.has(slot)).sort();
    if (added.length) placed[file] = added;
  }
  return placed;
}

// ---------------------------------------------------------------------------
// Text: blocks at anchors
// ---------------------------------------------------------------------------

/**
 * A block is inserted verbatim, exactly as the plugin stores it, immediately
 * above its anchor line.
 *
 * Verbatim rather than rendered: the plugin carries its own fences, comment
 * syntax and indentation, because those are properties of the file it lands
 * in — `#` in `.env.example`, `//` indented eight spaces inside a TypeScript
 * array. The fences are checked, not generated: a block that does not name
 * its plugin would be invisible to the pruner, and removal would leave it.
 */
export function checkFences(id, file, body) {
  let specs;
  try {
    specs = markerIds(file, body);
  } catch (error) {
    // A half-fenced block is worse than none: the pruner would take the file
    // apart. Say so here rather than end the process — a caller decides.
    if (error instanceof MarkerError) return `block for ${file} is not fenced: ${error.message}`;
    throw error;
  }
  if (!specs.has(id)) {
    return `block for ${file} has no "flama:begin ${id}" / "flama:end ${id}" fence — the pruner could never remove it`;
  }
  return null;
}

/**
 * `content` without the blocks of features the project does not have.
 *
 * Their entries are not here to say which of those blocks a slot put in
 * place, but the file is: it comes from a starter that had every feature, so
 * none of its fences is a hole a prune left, and a block on a slot is one a
 * slot put there.
 */
function trimText(manifest, file, content, known, report) {
  const foreign = new Set(
    [...grammar(() => markerIds(file, content))].filter((id) => id !== manifest.id && !known[id]),
  );
  if (!foreign.size) return content;
  if (report) console.log(`  trim   ${file} (no ${[...foreign].join(', ')} in this project)`);
  const slots = new Map([...foreign].map((id) => [id, grammar(() => slotsOf(file, content, id))]));
  return grammar(() => dropBlocks(file, content, foreign, { slots })) ?? content;
}

/**
 * Op 1: the plugin's own block, above `slot`. Shared by `insertBlocks` and by
 * `joinShared` when the block it would join is gone — the body comes from the
 * starter either way, so it can hold blocks of its own for features this
 * project dropped (the budgets step names the web app inside it); they are
 * trimmed the way the prune would have.
 */
function insertOwned(manifest, file, slot, sourcePath, known, dryRun, note = '') {
  const content = readText(file);
  const anchor = grammar(() => findAnchor(file, content, slot));
  if (!anchor) fail(`${file} has no "flama:plugins ${slot}" anchor — the insertion point is gone`);
  const source = join(manifest.dir, sourcePath);
  if (!existsSync(source)) fail(`${manifest.id}: block source "${sourcePath}" is missing`);
  const body = trimText(manifest, file, readFileSync(source, 'utf8'), known, false).replace(
    /\n$/,
    '',
  );
  const problem = checkFences(manifest.id, file, body);
  if (problem) fail(`${manifest.id}: ${problem}`);
  const lines = content.split('\n');
  lines.splice(anchor.index, 0, body);
  console.log(`  block  ${file} (above flama:plugins ${slot}${note})`);
  writeText(file, lines.join('\n'), dryRun);
}

/** A block whose file belongs to a feature this project does not have. */
function skipMissing(block, what) {
  if (existsSync(join(ROOT, block.file))) return false;
  // The CLI's sidebar entry needs a docs site to sit in: without `docs` there
  // is nothing to say. With no `needs` the file is one this starter should
  // have, so its absence means an anchor moved, and refusing is the answer.
  if (!block.needs) fail(`${block.file} does not exist; cannot place ${what}`);
  console.log(`  skip   ${block.file} ${what} (no ${block.needs} in this project)`);
  return true;
}

/**
 * Op 2: join the blocks this plugin shares with other features. Returns the
 * files it wrote this plugin's name into, which `insertBlocks` must not then
 * read as "already installed".
 *
 * A co-owned block goes only when the last of its owners does, and the pruner
 * narrows its fence meanwhile. Joining is that edit backwards — `widenMarker`
 * beside `narrowMarker` — at the block its anchor marks (`blockAbove`). That
 * block is the shared one only if it names an owner the plugin expects; when
 * every other owner was pruned, the pruner took the block too, and the plugin
 * puts it back as its own from the body it carries. The block is never found
 * by its contents: that made the starter's prose part of the plugin format.
 */
export function joinShared(manifest, known, dryRun) {
  const touched = [];
  for (const block of manifest.coOwned ?? []) {
    if (skipMissing(block, `shared block "${block.anchor}"`)) continue;
    const content = readText(block.file);
    const marked = grammar(() => blockAbove(block.file, content, block.anchor));
    const shared = marked?.ids.some(
      (owner) => owner !== manifest.id && block.order?.includes(owner),
    );
    touched.push(block.file);

    if (!shared) {
      if (!block.source) {
        fail(
          `${block.file}: nothing above "flama:plugins ${block.anchor}" for "${manifest.id}" to ` +
            'join — its other owners were pruned — and the plugin carries no body to put back.',
        );
      }
      insertOwned(
        manifest,
        block.file,
        block.anchor,
        block.source,
        known,
        dryRun,
        '; its other owners are not here',
      );
      continue;
    }
    if (marked.ids.includes(manifest.id)) {
      fail(`${block.file}: the shared block already names "${manifest.id}"`);
    }
    // After the last owner this plugin knows comes before it, rather than a
    // spec rebuilt from its own order: another plugin may have added an owner
    // this one has never heard of, and rebuilding would silently drop it.
    const before = block.order.slice(0, block.order.indexOf(manifest.id));
    const at = marked.ids.filter((owner) => before.includes(owner)).length;
    const lines = content.split('\n');
    lines[marked.begin] = widenMarker(lines[marked.begin], manifest.id, at);
    lines[marked.end] = widenMarker(lines[marked.end], manifest.id, at);
    const spec = /flama:begin\s+([\w|-]+)/.exec(lines[marked.begin])?.[1];
    console.log(`  widen  ${block.file} (${marked.ids.join('|')} → ${spec})`);
    writeText(block.file, lines.join('\n'), dryRun);
  }
  return touched;
}

/** Op 1, for each of the plugin's own blocks. */
export function insertBlocks(manifest, alreadyTouched, known, dryRun) {
  // A feature can own several blocks in one file, each at its own anchor —
  // the control plane has one in `.env.example` for the API's URLs and one of
  // its own — so "this file already
  // carries the plugin" only means something about files this run has not
  // written yet.
  const touched = new Set(alreadyTouched);
  for (const block of manifest.blocks ?? []) {
    if (skipMissing(block, `block "${block.anchor}"`)) continue;
    const content = readText(block.file);
    if (
      !touched.has(block.file) &&
      grammar(() => hasFilledBlock(block.file, content, manifest.id))
    ) {
      fail(`${block.file} already carries a "${manifest.id}" block`);
    }
    insertOwned(manifest, block.file, block.anchor, block.source, known, dryRun);
    touched.add(block.file);
  }
}

/**
 * Op 1 for a feature the starter ships: its blocks, replayed from the starter.
 *
 * `snapshot` is the file as the starter has it. Trimmed to this project's
 * features it is what the file should become (`ours`); without this plugin's
 * blocks as well it is what the prune left (`base`). A three-way merge puts
 * the difference onto the project's copy, so a file the project has changed
 * since still takes the blocks, and one changed in the same place stops the
 * install rather than guessing.
 *
 * A file the feature replaces is a snapshot too: the feature's version of
 * it, whose blocks the prune took out whole, so the base is the starter's
 * version and the merge makes it the feature's.
 */
export function replaySnapshots(manifest, known, dryRun) {
  for (const snapshot of manifest.snapshots ?? []) {
    if (skipMissing(snapshot, 'blocks')) continue;
    const source = join(manifest.dir, snapshot.source);
    if (!existsSync(source)) fail(`${manifest.id}: snapshot "${snapshot.source}" is missing`);
    const content = readText(snapshot.file);
    if (grammar(() => hasFilledBlock(snapshot.file, content, manifest.id))) {
      fail(`${snapshot.file} already carries a "${manifest.id}" block`);
    }
    const ours = trimText(manifest, snapshot.file, readFileSync(source, 'utf8'), known, false);
    // The project's copy holds this plugin's emptied fences where a prune left
    // them — unless it was pruned before prunes kept them, or the feature
    // replaces the file, in which case the blocks went whole and the base has
    // to say so too.
    // The rest went as its entry declares: the ones a slot put in place, whole.
    // A plugin that carries no declaration is read from the starter's copy,
    // where a block on a slot is one a slot put there.
    const replaced = Boolean(manifest.feature.replaces?.includes(snapshot.file));
    const whole = replaced || !grammar(() => markerIds(snapshot.file, content)).has(manifest.id);
    const declared = manifest.feature.slots
      ? new Set(manifest.feature.slots[snapshot.file] ?? [])
      : grammar(() => slotsOf(snapshot.file, ours, manifest.id));
    const slots = new Map([[manifest.id, declared]]);
    const base =
      grammar(() => dropBlocks(snapshot.file, ours, new Set([manifest.id]), { whole, slots })) ??
      ours;
    const merged = mergeThreeWay(snapshot.file, content, base, ours);
    const note = replaced ? "the feature's version" : "from the starter's copy";
    console.log(`  blocks ${snapshot.file} (${note})`);
    writeText(snapshot.file, merged, dryRun);
  }
}

/** `git merge-file`: `base → ours` applied to `current`, or a refusal. */
function mergeThreeWay(file, current, base, ours) {
  const dir = mkdtempSync(join(tmpdir(), 'flama-merge-'));
  try {
    const paths = ['current', 'base', 'ours'].map((name) => join(dir, name));
    for (const [index, text] of [current, base, ours].entries()) {
      writeFileSync(paths[index], text);
    }
    try {
      return execFileSync('git', ['merge-file', '-p', ...paths], { encoding: 'utf8' });
    } catch (error) {
      if (typeof error.status === 'number' && error.status > 0) {
        fail(
          `${file}: the project changed the lines the plugin's blocks go between; ` +
            'merge by hand from the starter, or remove the conflicting edit first',
        );
      }
      throw error;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Every text file under the copied `paths` that carries a block for a feature
 * this project does not have, left as the prune would have left it.
 */
export function trimCopied(manifest, paths, known, dryRun) {
  if (dryRun) return;
  const files = [];
  const walk = (at) => {
    if (!existsSync(at)) return;
    if (!statSync(at).isDirectory()) return files.push(at);
    for (const entry of readdirSync(at)) walk(join(at, entry));
  };
  for (const path of paths) walk(join(ROOT, path));
  for (const full of files) {
    const content = readFileSync(full, 'utf8');
    if (content.includes('\0') || !content.includes('flama:begin')) continue;
    const text = trimText(manifest, relative(ROOT, full), content, known, true);
    if (text !== content) writeFileSync(full, text);
  }
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/**
 * Op 3: the plugin's manifest-declared JSON edits, backwards.
 *
 * A feature declares the JSON it is responsible for — a turbo env
 * pass-through, a biome ignore, a pnpm override, a package script — and the
 * pruner takes those out when the feature goes. Installing reads the same
 * declaration the other way: `remove` values go back at `at`, `set` keys with
 * their values at `setAt`. Two index lists, not one, so an array value and an
 * object key cannot read each other's positions.
 */
export function applyJsonEdits(manifest, dryRun) {
  for (const edit of manifest.feature.json ?? []) {
    const target = join(ROOT, edit.file);
    // What the edit lands in went with something this project pruned — the
    // file, in a tree gone with the last app that needed it (the consumer
    // package), or the value, in the entry of a feature it does not have (the
    // organizations paths the MCP server's tools join) — so the edit has
    // nothing to say. `needs` is what says it may.
    const landing =
      existsSync(target) &&
      edit.path
        .slice(0, -1)
        .reduce((node, key) => node?.[key], JSON.parse(readFileSync(target, 'utf8'))) !== undefined;
    if (!landing && edit.needs) {
      console.log(`  skip   ${edit.file} (no ${edit.needs} in this project)`);
      continue;
    }
    if (!existsSync(target)) fail(`${edit.file} does not exist; cannot apply a JSON edit`);
    const original = readFileSync(target, 'utf8');
    let text = original;
    // Without a position a value is appended, which is always valid JSON.
    for (const [index, value] of (edit.remove ?? []).entries()) {
      const next = insertJsonValue(text, edit.path, value, edit.at?.[index]);
      if (next === null)
        fail(`${edit.file}: cannot put "${value}" back into ${edit.path.join(' → ')}`);
      text = next;
    }
    // `expand` is the edit's to say: where the formatter breaks every array,
    // as it does in a `package.json`, the entry goes back the way it found it.
    const expand = edit.expand === true;
    for (const [index, [key, value]] of Object.entries(edit.set ?? {}).entries()) {
      const rendered = renderJsonEntry(key, value, edit.path.length + 1, { expand });
      const next = insertJsonEntry(text, edit.path, rendered, edit.setAt?.[index]);
      if (next === null)
        fail(`${edit.file}: cannot put "${key}" back into ${edit.path.join(' → ')}`);
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
