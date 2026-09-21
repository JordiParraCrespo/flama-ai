/**
 * The marker language, shared by everything that adds or removes a slice of
 * this repo.
 *
 * A marker wraps the lines that exist only because of some optional piece:
 *
 *   # flama:begin widget        (any comment syntax: #, //, <!-- -->)
 *   ...lines that exist only because of the widget...
 *   # flama:end widget
 *
 * A marker can name several ids — `flama:begin widget|gadget` — and its block
 * goes only when all of them go. (The ids here are made up: this file outlives
 * a prune, so naming a real feature would leave a dangling mention behind.)
 *
 * Two tools speak this language, in opposite directions.
 * `scripts/starter/prune.mjs` removes blocks when a starter feature is dropped;
 * the plugin installer adds them when a plugin is installed. That is why this
 * module lives here rather than beside the pruner: a one-shot prune deletes
 * `scripts/starter/` entirely, and the installer has to outlive it.
 *
 * ## Two namespaces
 *
 * Ids without a prefix are starter features, declared in
 * `scripts/starter/features.json`. Ids prefixed `plugin:` belong to an
 * installed plugin and are declared in `.flama-plugins.json` instead — they are
 * written by the installer, not by hand, so the pruner neither validates them
 * against its manifest nor strips them when it strips its own.
 *
 * ## Anchors
 *
 * An anchor is a lone comment marking where a plugin's block should be
 * inserted:
 *
 *   // flama:plugins api-modules
 *
 * Anchors are not markers: they are inert to `annotate`, they survive a prune,
 * and they are what makes an install an insertion at a known point rather than
 * a patch against surrounding source.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The id character class admits `:` so that a namespaced plugin id survives as
 * one id. Without it `plugin:stripe` would parse as `plugin`, and every
 * installed plugin would share a single marker id.
 */
export const MARKER_RE = /^\s*(?:#|\/\/|<!--|\{\{-?\s*\/\*|\/\*)\s*flama:(begin|end)\s+([\w|:-]+)/;

/** `// flama:plugins <slot>` — an insertion point, not a block. */
export const ANCHOR_RE = /^(\s*)(?:#|\/\/|<!--|\{\{-?\s*\/\*|\/\*)\s*flama:plugins\s+([\w-]+)/;

export const PLUGIN_ID_PREFIX = 'plugin:';

/** True for a marker id owned by an installed plugin rather than the starter. */
export function isPluginId(id) {
  return id.startsWith(PLUGIN_ID_PREFIX);
}

/**
 * True when every id on a marker belongs to a plugin — the block is the
 * installer's to remove, and nothing else may strip it.
 */
export function isPluginMarker(ids) {
  return ids.length > 0 && ids.every(isPluginId);
}

export function fail(message) {
  console.error(`error: ${message}`);
  process.exit(2);
}

export function isText(buffer) {
  const sample = buffer.subarray(0, 8000);
  return !sample.includes(0);
}

/**
 * Annotate every line with the marker blocks enclosing it: `{ line, stack,
 * marker, ids }` where `stack` is the list of id-arrays of the open blocks
 * (outer first), `marker` is true for the begin/end lines themselves, and
 * `ids` holds that line's own ids when it is one. Blocks may nest. Fails on
 * unbalanced markers.
 */
export function annotate(file, content) {
  const open = [];
  const result = content.split('\n').map((line, index) => {
    const match = MARKER_RE.exec(line);
    if (!match) return { line, stack: [...open], marker: false, ids: null };
    const [, kind, spec] = match;
    const ids = spec.split('|');
    if (kind === 'begin') {
      open.push({ ids, begin: index + 1 });
      return { line, stack: [...open], marker: true, ids };
    }
    const current = open.pop();
    if (!current) fail(`${file}:${index + 1}: flama:end without a begin`);
    if (current.ids.join('|') !== spec) {
      fail(
        `${file}:${index + 1}: flama:end ${spec} closes flama:begin ${current.ids.join('|')} (line ${current.begin})`,
      );
    }
    return { line, stack: [...open, current], marker: true, ids };
  });
  if (open.length)
    fail(`${file}:${open[0].begin}: flama:begin ${open[0].ids.join('|')} is never closed`);
  return result;
}

/** Word-boundary match for an identifier such as `apps/web` or `@flama/web`. */
export function identifierRegex(identifier) {
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const tail = identifier.endsWith('-') || identifier.endsWith('/') ? '' : '(?![\\w-])';
  return new RegExp(`(?<![\\w@/-])${escaped}${tail}`);
}

/**
 * Every real file git knows about under `root`, minus anything matching
 * `skip`. Symlinks are dropped: every `CLAUDE.md` is one, and rewriting
 * through a link would edit the `AGENTS.md` it points at twice.
 */
export function trackedFiles(root, { untracked = true, skip = [] } = {}) {
  const out = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', ...(untracked ? ['--others', '--exclude-standard'] : [])],
    { cwd: root, maxBuffer: 64 * 1024 * 1024 },
  );
  return out
    .toString('utf8')
    .split('\0')
    .filter(
      (file) =>
        file &&
        existsSync(join(root, file)) &&
        !lstatSync(join(root, file)).isSymbolicLink() &&
        statSync(join(root, file)).isFile(),
    )
    .filter((file) => !skip.some((re) => re.test(file)));
}

/**
 * Apply `mutate` to a JSON file, writing it back only when it reports a
 * change. For the files that cannot carry a marker because the format has no
 * comments — `package.json`, `biome.json`, the locale catalogs.
 *
 * Returns true when the file changed.
 */
export function editJson(root, file, mutate, { dryRun = false } = {}) {
  const path = join(root, file);
  if (!existsSync(path)) return false;
  const json = JSON.parse(readFileSync(path, 'utf8'));
  if (!mutate(json)) return false;
  if (!dryRun) writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
  return true;
}

export function collapseBlankRuns(text) {
  return text.replace(/\n{3,}/g, '\n\n');
}
