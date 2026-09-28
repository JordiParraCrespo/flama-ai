/**
 * The marker comment grammar, and the edits made with it.
 *
 * A marker wraps the lines that exist only because of some optional piece:
 *
 *   # flama:begin widget        (any comment syntax: #, //, <!-- -->, JSX braces)
 *   ...lines that exist only because of the widget...
 *   # flama:end widget
 *
 * A marker can name several ids — `flama:begin widget|gadget` — and its block
 * belongs to all of them. An anchor, `# flama:plugins <slot>`, is the other
 * half: a named place a block goes. (The ids here are made up: this file is
 * scanned by `pnpm starter:check`, and a real feature named here would read
 * as a mention outside its markers.)
 *
 * Two callers need this and have to agree on every byte: the pruner
 * (`scripts/starter/prune.mjs`), which takes blocks out, and the plugin
 * installer (`scripts/plugins/`), which puts them in and runs the prune's own
 * edit over what it copies. So everything that reads or rewrites a marker
 * lives here — parsing (`annotate`), finding a slot (`findAnchor`) and the
 * block it marks (`blockAbove`), and the three edits (`dropBlocks`,
 * `narrowMarker`, `widenMarker`). Nothing outside this file splits a spec on
 * `|`. No filesystem, no git, no process exit: those are the callers'.
 */

export const MARKER_RE =
  /^\s*(?:#|\/\/|<!--|\{\{-?\s*\/\*|\{\s*\/\*|\/\*)\s*flama:(begin|end)\s+([\w|-]+)/;

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
export const ANCHOR_RE =
  /^(\s*)(?:#|\/\/|<!--|\{\{-?\s*\/\*|\{\s*\/\*|\/\*)\s*flama:plugins\s+([\w-]+)\b/;

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
 * The block a slot marks: the one that ends immediately above its anchor,
 * with nothing between but blank lines and other anchors. `{ ids, begin, end
 * }` (line indexes of its two fences), or null when the slot marks nothing —
 * which is what a prune leaves once every owner of a shared block has gone.
 *
 * "Immediately above" is the contract between a shared block and its anchor:
 * the anchor is placed beside the block so an installer can find the block
 * without reading its contents. A comment or a line of code in between means
 * the anchor marks no block, never "the nearest one further up", which would
 * hand the installer some other feature's lines.
 */
export function blockAbove(file, content, slot) {
  const anchor = findAnchor(file, content, slot);
  if (!anchor) return null;
  const lines = annotate(file, content);
  for (let i = anchor.index - 1; i >= 0; i--) {
    const { line, stack, marker } = lines[i];
    if (ANCHOR_RE.test(line) || !line.trim()) continue;
    if (!marker || MARKER_RE.exec(line)[1] !== 'end') return null;
    const { ids, begin } = stack.at(-1);
    return { ids, begin: begin - 1, end: i };
  }
  return null;
}

/** Every id any marker in `content` names, once each. */
export function markerIds(file, content) {
  const ids = new Set();
  for (const { stack, marker } of annotate(file, content)) {
    if (marker) for (const id of stack.at(-1).ids) ids.add(id);
  }
  return ids;
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

/**
 * Every block in `content`, as `{ ids, begin, end }` line indexes of its two
 * fences, outermost first. Throws `MarkerError` like `annotate`.
 */
function blocksOf(file, content) {
  const blocks = [];
  const open = [];
  annotate(file, content).forEach(({ line, marker }, index) => {
    if (!marker) return;
    const [, kind, spec] = MARKER_RE.exec(line);
    if (kind === 'begin') {
      const block = { ids: spec.split('|'), begin: index, end: -1 };
      blocks.push(block);
      open.push(block);
    } else {
      open.pop().end = index;
    }
  });
  return blocks;
}

/**
 * The slot a block sits on: the name of the `flama:plugins` anchor that
 * follows it, with nothing between but blank lines, other anchors, and other
 * whole blocks — the stack several plugins leave above one slot. Null when a
 * line of the file's own comes first.
 */
function slotOf(lines, block, blocks) {
  const byBegin = new Map(blocks.map((other) => [other.begin, other]));
  for (let i = block.end + 1; i < lines.length; i++) {
    const anchor = ANCHOR_RE.exec(lines[i]);
    if (anchor) return anchor[2];
    if (!lines[i].trim()) continue;
    const sibling = byBegin.get(i);
    if (!sibling) return null;
    i = sibling.end;
  }
  return null;
}

/** The slots in `content` a block of `id` sits on, filled or empty. */
export function slotsOf(file, content, id) {
  const blocks = blocksOf(file, content);
  const lines = content.split('\n');
  return new Set(
    blocks
      .filter((block) => block.ids.includes(id))
      .map((block) => slotOf(lines, block, blocks))
      .filter(Boolean),
  );
}

/** The ids of every block that sits on `slot` in `content`. */
export function idsOnSlot(file, content, slot) {
  const blocks = blocksOf(file, content);
  const lines = content.split('\n');
  return new Set(
    blocks.filter((block) => slotOf(lines, block, blocks) === slot).flatMap((block) => block.ids),
  );
}

/**
 * `content` with every block owned only by `removed` ids emptied, and every
 * co-owned fence narrowed to the owners that are left. Null when the file has
 * no blocks at all, so a caller can skip rewriting it.
 *
 * This is the one edit a prune makes to a file that stays, and it lives here
 * because two callers make it: the pruner over the repo, and the installer
 * over what it copies in. A plugin's files were extracted from a starter that
 * still had every feature, so a docs page can carry a `mobile` block into a
 * project that pruned `mobile` long ago — and it should arrive the way the
 * prune would have left it.
 *
 * A block empties; its fences stay. The fences are the feature's own place in
 * the file — `/admin/users` between `/tokens` and the flags row, the `admin`
 * scope group between `users` and `roles` — and a plugin that brings the
 * feature back merges into that hole, not into a slot every plugin shares.
 * Two plugins filling one list keep a fence apiece between them, so their
 * merges never meet. The exception is a block a slot put there: the slot is
 * its place, and it goes whole, leaving the slot as it was.
 *
 * Which blocks a slot put there is the feature's to say, never where a block
 * happens to sit: a hole a prune left can sit right above a filled slot.
 * `slots` maps each removed id to the anchors in this file it declares a
 * block on — what the installer records as it puts a block in, and what a
 * starter feature declares for the blocks it keeps above an anchor. A block
 * on none of them leaves its fences.
 *
 * Markers survive for the same reason. `plugin:remove` is the pruner, and it
 * finds a plugin's lines by its fences; stripping them would make an installed
 * plugin unremovable and a co-owned block unwidenable by the next install.
 *
 * `whole` takes every block out whole, fences and all: what a prune did before
 * it kept them, which a project pruned then still looks like.
 */
export function dropBlocks(file, content, removed, { whole = false, slots = new Map() } = {}) {
  const blocks = blocksOf(file, content);
  if (!blocks.length) return null;
  const lines = content.split('\n');
  const gone = (block) => block.ids.every((id) => removed.has(id));
  const slotted = (block) => {
    const slot = slotOf(lines, block, blocks);
    return Boolean(slot) && block.ids.some((id) => slots.get(id)?.has(slot));
  };
  const drop = new Set();
  const kept = new Set();
  for (const block of blocks) {
    if (!gone(block) || drop.has(block.begin)) continue;
    for (let i = block.begin; i <= block.end; i++) drop.add(i);
    if (!whole && !slotted(block)) {
      kept.add(block.begin);
      kept.add(block.end);
    }
  }
  const out = lines.flatMap((line, index) => {
    if (kept.has(index)) return [line];
    if (drop.has(index)) return [];
    return [MARKER_RE.test(line) ? narrowMarker(line, removed) : line];
  });
  return collapseBlankRuns(out.join('\n'));
}

/**
 * Whether the block whose begin fence is at `index` holds nothing — what a
 * prune leaves of a feature that may come back, and so the one kind of block
 * that may name a feature the project does not have.
 */
export function isEmptyBlock(file, content, index) {
  const block = blocksOf(file, content).find((candidate) => candidate.begin === index);
  return Boolean(block) && block.end === block.begin + 1;
}

/** Whether `content` holds a block naming `id` that has lines in it. */
export function hasFilledBlock(file, content, id) {
  return blocksOf(file, content).some(
    (block) => block.ids.includes(id) && block.end > block.begin + 1,
  );
}

/** Deleting a block leaves the blank lines either side of it; keep one. */
export function collapseBlankRuns(text) {
  return text.replace(/\n{3,}/g, '\n\n');
}

/** Word-boundary match for an identifier such as `apps/web` or `@flama/web`. */
export function identifierRegex(identifier) {
  const escaped = identifier.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const tail = identifier.endsWith('-') || identifier.endsWith('/') ? '' : '(?![\\w-])';
  return new RegExp(`(?<![\\w@/-])${escaped}${tail}`);
}
