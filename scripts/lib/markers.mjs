/**
 * The marker comment grammar.
 *
 * A marker wraps the lines that exist only because of some optional piece:
 *
 *   # flama:begin widget        (any comment syntax: #, //, <!-- -->)
 *   ...lines that exist only because of the widget...
 *   # flama:end widget
 *
 * A marker can name several ids — `flama:begin widget|gadget` — and its block
 * belongs to all of them. (The ids here are made up: this file outlives a
 * prune, so naming a real feature would leave a dangling mention behind.)
 *
 * This module is the grammar and nothing else: no filesystem, no git, no
 * process exit. `scripts/starter/prune.mjs` is its only caller today and owns
 * its own IO; a later plugin installer will parse the same markers without
 * inheriting the pruner's helpers. That separation is the reason this lives
 * outside `scripts/starter/`, which a one-shot prune deletes.
 */

export const MARKER_RE = /^\s*(?:#|\/\/|<!--|\{\{-?\s*\/\*|\/\*)\s*flama:(begin|end)\s+([\w|-]+)/;

/** A malformed marker. Callers decide whether that is a warning or an exit. */
export class MarkerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MarkerError';
  }
}

/**
 * Annotate every line with the marker blocks enclosing it: `{ line, stack,
 * marker }` where `stack` is the list of id-arrays of the open blocks (outer
 * first) and `marker` is true for the begin/end lines themselves. Blocks may
 * nest. Throws `MarkerError` on unbalanced markers.
 */
export function annotate(file, content) {
  const open = [];
  const result = content.split('\n').map((line, index) => {
    const match = MARKER_RE.exec(line);
    if (!match) return { line, stack: [...open], marker: false };
    const [, kind, spec] = match;
    const ids = spec.split('|');
    if (kind === 'begin') {
      open.push({ ids, begin: index + 1 });
      return { line, stack: [...open], marker: true };
    }
    const current = open.pop();
    if (!current) throw new MarkerError(`${file}:${index + 1}: flama:end without a begin`);
    if (current.ids.join('|') !== spec) {
      throw new MarkerError(
        `${file}:${index + 1}: flama:end ${spec} closes flama:begin ${current.ids.join('|')} (line ${current.begin})`,
      );
    }
    return { line, stack: [...open, current], marker: true };
  });
  if (open.length) {
    throw new MarkerError(
      `${file}:${open[0].begin}: flama:begin ${open[0].ids.join('|')} is never closed`,
    );
  }
  return result;
}

/**
 * `// flama:plugins <slot>` — an insertion point, not a block.
 *
 * An anchor is a lone comment naming where an installed plugin's block goes.
 * It is inert to `annotate`, so a prune neither validates nor strips it, and
 * it survives into a pruned project where the installer still has to work.
 * The installer inserts immediately above it, at its indentation.
 */
export const ANCHOR_RE = /^(\s*)(?:#|\/\/|<!--|\{\{-?\s*\/\*|\/\*)\s*flama:plugins\s+([\w-]+)\b/;

/**
 * Where a slot's anchor sits, or null. Returns the line index and the
 * anchor's own indentation, which the inserted block adopts.
 *
 * A slot must appear exactly once per file; two anchors with the same name
 * means the insertion point is ambiguous, which is a `MarkerError` rather
 * than a coin flip.
 */
export function findAnchor(file, content, slot) {
  const hits = content
    .split('\n')
    .map((line, index) => ({ line, index, match: ANCHOR_RE.exec(line) }))
    .filter((entry) => entry.match?.[2] === slot);
  if (hits.length === 0) return null;
  if (hits.length > 1) {
    throw new MarkerError(
      `${file}: ${hits.length} anchors named "${slot}" (lines ${hits.map((h) => h.index + 1).join(', ')})`,
    );
  }
  return { index: hits[0].index, indent: hits[0].match[1] };
}

/**
 * The same marker with some ids taken out of its spec.
 *
 * A marker naming several features outlives the first of them to go — its
 * block belongs to all of them and leaves only with the last. What must not
 * outlive them is the *name*: `flama:begin mcp|cli` with `cli` gone cites a
 * feature that no longer exists. So the block stays and the spec narrows to
 * whoever is left. Returns the line unchanged when nothing, or everything,
 * was named.
 */
export function narrowMarker(line, removed) {
  const match = MARKER_RE.exec(line);
  if (!match) return line;
  const ids = match[2].split('|');
  const kept = ids.filter((id) => !removed.has(id));
  if (!kept.length || kept.length === ids.length) return line;
  return line.replace(match[2], kept.join('|'));
}

/**
 * Put `id` back into a marker's spec, at index `at`.
 *
 * The inverse of `narrowMarker`, and it lives beside it because they are the
 * same edit in two directions: a prune takes an owner out of a co-owned block,
 * an install puts one back. Nothing outside this file should be splitting a
 * spec on `|` — that is the grammar, and a second implementation of it is how
 * the next co-owned shape forks.
 */
export function widenMarker(line, id, at) {
  const match = MARKER_RE.exec(line);
  if (!match) return line;
  const ids = match[2].split('|');
  if (ids.includes(id)) return line;
  return line.replace(match[2], [...ids.slice(0, at), id, ...ids.slice(at)].join('|'));
}

/** Word-boundary match for an identifier such as `apps/web` or `@flama/web`. */
export function identifierRegex(identifier) {
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const tail = identifier.endsWith('-') || identifier.endsWith('/') ? '' : '(?![\\w-])';
  return new RegExp(`(?<![\\w@/-])${escaped}${tail}`);
}
