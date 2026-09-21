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

/** Word-boundary match for an identifier such as `apps/web` or `@flama/web`. */
export function identifierRegex(identifier) {
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const tail = identifier.endsWith('-') || identifier.endsWith('/') ? '' : '(?![\\w-])';
  return new RegExp(`(?<![\\w@/-])${escaped}${tail}`);
}
