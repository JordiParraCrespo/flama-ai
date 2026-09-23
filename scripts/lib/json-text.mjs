/**
 * Format-preserving surgery on JSON files.
 *
 * Re-serialising with `JSON.stringify` reformats the whole file — it expands
 * every array the author kept on one line — so an edit that drops a single
 * pattern from `biome.json` rewrites unrelated parts of it. Nothing complains,
 * because the JSON means the same thing, but it means removing a plugin does
 * not return the file to where it started, and byte-identical removal is the
 * guarantee the whole plugin format rests on.
 *
 * So every edit here is on the text. The functions come in pairs — delete and
 * insert — and each pair round-trips: what one takes out, the other puts back
 * in the same shape.
 *
 * This lives beside `markers.mjs` rather than inside either caller, because
 * the pruner and the installer are the two halves of one operation and have to
 * agree on the bytes. It is the surgery and nothing else: no knowledge of
 * features, plugins or manifests.
 */

const ESCAPE = /[.*+?^${}()|[\]\\]/g;

/** The literal as a quoted string inside a regex — for finding it. */
function quote(literal) {
  return `"${literal.replace(ESCAPE, '\\$&')}"`;
}

/**
 * The literal as it is written in the file — for emitting it.
 *
 * Not `quote`: that escapes the regex metacharacters these values are full of
 * (`dist/**`, `VITE_*`), which is right for matching and would write a
 * backslash into the file.
 */
function render(literal) {
  return JSON.stringify(literal);
}

/** The indentation of the first line matching `match`, or null. */
function indentOf(lines, match) {
  const line = lines.find((candidate) => match.test(candidate));
  return line === undefined ? null : (/^\s*/.exec(line)?.[0] ?? '');
}

// ---------------------------------------------------------------------------
// Values: a member of an array, or a whole `"key": value` line
// ---------------------------------------------------------------------------

/**
 * Delete a value from the array at `path`, and report where it was.
 *
 * Scoped, and there is no unscoped version. Searching a whole file and taking
 * the first match is right for a literal that occurs once and wrong for one
 * that does not: `"web"` is a feature key in `features.json` *and* a member of
 * half its `neededBy` lists, so an unscoped delete takes out the feature. That
 * is a bug waiting on the next caller, so the function that could commit it
 * does not exist.
 *
 * The index it returns is what `insertJsonValue` needs to put the value back
 * where it was, which is what makes a removal and an install exact inverses.
 * Returns null when the array or the value is not there.
 */
export function deleteJsonValueAt(text, path, literal) {
  const lines = text.split('\n');
  const opening = findArray(lines, path);
  if (opening === null) return null;

  if (isInline(lines[opening])) {
    const line = lines[opening];
    const start = line.indexOf('[');
    const end = line.indexOf(']', start);
    const members = splitMembers(line.slice(start + 1, end));
    const at = members.indexOf(render(literal));
    if (at === -1) return null;
    members.splice(at, 1);
    lines[opening] = `${line.slice(0, start)}[${members.join(', ')}]${line.slice(end + 1)}`;
    return { text: lines.join('\n'), at };
  }

  const close = closingOf(lines, opening);
  if (close === -1) return null;
  const match = new RegExp(`^\\s*${quote(literal)}\\s*,?\\s*$`);
  const index = lines.findIndex((line, i) => i > opening && i < close && match.test(line));
  if (index === -1) return null;
  const at = index - opening - 1;
  lines.splice(index, 1);
  // The member before it carried a comma only because this one followed.
  if (/^\s*\]/.test(lines[index] ?? '')) {
    lines[index - 1] = lines[index - 1].replace(/,(\s*)$/, '$1');
  }
  return { text: lines.join('\n'), at };
}

/**
 * Put a value back into the array at `path`, at `at`.
 *
 * `path` is an array of keys, not a dotted string: the keys here are file
 * paths (`scripts/check-bundle-size.mjs`), so a dot is data.
 *
 * The mirror of `deleteJsonValueAt`, and the reason a JSON
 * edit needs no anchor: unlike a line of text, a position in an array is
 * addressable, so what a removal recorded as `at` is where the value goes
 * back. The array's shape is followed, not imposed — inline stays inline, one
 * member per line stays one per line.
 *
 * Returns null when the array is not there or `at` is past its end.
 */
export function insertJsonValue(text, path, literal, at) {
  const lines = text.split('\n');
  const opening = findArray(lines, path);
  if (opening === null) return null;
  // No position recorded means append: always valid, and what an edit written
  // for the pruner alone leaves unsaid.
  const index = at ?? Number.POSITIVE_INFINITY;

  // Inline: the whole array is on the line that opens it.
  if (isInline(lines[opening])) {
    const line = lines[opening];
    const start = line.indexOf('[');
    const end = line.indexOf(']', start);
    const members = splitMembers(line.slice(start + 1, end));
    const where = Math.min(index, members.length);
    members.splice(where, 0, render(literal));
    lines[opening] = `${line.slice(0, start)}[${members.join(', ')}]${line.slice(end + 1)}`;
    return lines.join('\n');
  }

  // Expanded: one member per line until the closing bracket.
  const close = closingOf(lines, opening);
  if (close === -1) return null;
  const members = close - opening - 1;
  const where = Math.min(index, members);
  const indent =
    indentOf(lines.slice(opening + 1, close), /\S/) ??
    `${/^\s*/.exec(lines[opening])?.[0] ?? ''}  `;
  const line = opening + 1 + where;
  const last = where === members;
  lines.splice(line, 0, `${indent}${render(literal)}${last ? '' : ','}`);
  if (last && members > 0) lines[line - 1] = `${lines[line - 1].replace(/\s*$/, '')},`;
  return lines.join('\n');
}

/** Whether the array opening on this line also closes on it. */
function isInline(line) {
  return /\]/.test(line.slice(line.indexOf('[')));
}

/** The members of an inline array body, split on the commas between them. */
function splitMembers(body) {
  const trimmed = body.trim();
  if (!trimmed) return [];
  return trimmed.split(/\s*,\s*/);
}

/**
 * The line index where the array at `path` opens.
 *
 * The walk is by key name at increasing indentation rather than a real parse:
 * these are hand-written config files a few levels deep, and a parser would
 * have to give back positions the text edit could use, which is most of a
 * formatter. A key that appears twice at the same depth is the limit, and the
 * caller validates the result parses to what it intended.
 */
function findArray(lines, path) {
  const segments = path;
  let from = 0;
  let to = lines.length;
  for (const [depth, key] of segments.entries()) {
    const match = new RegExp(`^\\s*${quote(key)}\\s*:`);
    const index = lines.findIndex((line, i) => i >= from && i < to && match.test(line));
    if (index === -1) return null;
    if (depth === segments.length - 1) return lines[index].includes('[') ? index : null;
    from = index + 1;
    to = closingOf(lines, index);
    if (to === -1) return null;
  }
  return null;
}

/**
 * How many brackets the line opens and does not close, ignoring any inside a
 * string — `"qa": "pnpm --filter {x} qa"` opens nothing.
 */
function depthOf(line) {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inString) {
      if (char === '\\') i++;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{' || char === '[') depth++;
    else if (char === '}' || char === ']') depth--;
  }
  return depth;
}

/**
 * The line closing the bracket opened on `index` — which is `index` itself for
 * a member the author wrote on one line.
 *
 * By bracket depth rather than by indentation: two closers that agree on the
 * bytes can still disagree on where an entry ends, and the one that reads the
 * brackets is the one that is right. It also gives the one-line case an honest
 * answer instead of "no closing line at all".
 */
function closingOf(lines, index) {
  let depth = depthOf(lines[index]);
  if (depth <= 0) return index;
  for (let i = index + 1; i < lines.length; i++) {
    depth += depthOf(lines[i]);
    if (depth <= 0) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Entries: a whole `"key": { … }` member of an object
// ---------------------------------------------------------------------------

/**
 * The lines of the entry `key` in the object at `path`, verbatim, without the
 * comma that separates it from its neighbour. Null when it is not there.
 *
 * This is what lets a plugin carry its own manifest entry as text: what comes
 * out here is what goes back in through `insertJsonEntry`, byte for byte, so
 * neither side needs a serialiser that matches the file's house style.
 */
export function readJsonEntry(text, path, key) {
  const lines = text.split('\n');
  const found = findEntry(lines, path, key);
  if (!found) return null;
  const [start, end] = found;
  const body = lines.slice(start, end + 1);
  body[body.length - 1] = body[body.length - 1].replace(/,\s*$/, '');
  return body.join('\n');
}

/** Delete the entry `key` from the object at `path`, and its comma. */
export function deleteJsonEntry(text, path, key) {
  const lines = text.split('\n');
  const found = findEntry(lines, path, key);
  if (!found) return null;
  const [start, end] = found;
  lines.splice(start, end - start + 1);
  // The entry before it carried a comma only because this one followed.
  const previous = start - 1;
  if (previous >= 0 && /^\s*[}\]]/.test(lines[start] ?? '')) {
    lines[previous] = lines[previous].replace(/,(\s*)$/, '$1');
  }
  // That may have been the last member. An object with nothing in it is
  // written `{}` here — the same shape `insertJsonEntry` opens up to make
  // room — so closing it again is what makes the two exact inverses.
  const opening = findObject(lines, path);
  if (
    opening !== null &&
    start === opening + 1 &&
    /\{\s*$/.test(lines[opening]) &&
    /^\s*\}/.test(lines[start] ?? '')
  ) {
    const rest = lines[start].replace(/^\s*\}/, '');
    lines.splice(opening, 2, `${lines[opening].replace(/\{\s*$/, '{}')}${rest}`);
  }
  return lines.join('\n');
}

/**
 * Put `entry` — text of the shape `readJsonEntry` returns — into the object at
 * `path`, at member `at`, or last when `at` is omitted.
 *
 * Order in these files is not semantic, so appending is always correct; `at`
 * is for putting something back where a reader would expect it, next to the
 * scripts it belongs with rather than after the last one in the file.
 */
export function insertJsonEntry(text, path, entry, at) {
  const lines = text.split('\n');
  const opening = findObject(lines, path);
  if (opening === null) return null;
  let close = closingOf(lines, opening);
  if (close === -1) return null;

  // An empty object is written `{}` here, and has no room between its braces.
  // Open it up, then insert as normal — `deleteJsonEntry` closes it again when
  // the last member goes, so a file that has never had a member of this kind
  // reads the same as one that lost its last.
  if (close === opening) {
    const indent = /^\s*/.exec(lines[opening])?.[0] ?? '';
    const [before, after] = lines[opening].split(/\{\s*\}/);
    if (after === undefined) return null;
    lines.splice(opening, 1, `${before}{`, `${indent}}${after}`);
    close = opening + 1;
  }

  // Member boundaries: a line at the object's own member indentation opens a
  // member, whether it is a one-liner or a block.
  const indent = `${/^\s*/.exec(lines[opening])?.[0] ?? ''}  `;
  const starts = [];
  for (let i = opening + 1; i < close; i++) {
    if (new RegExp(`^${indent}\\S`).test(lines[i])) starts.push(i);
  }
  const index = at === undefined || at >= starts.length ? close : starts[at];
  if (at !== undefined && at > starts.length) return null;

  const body = entry.split('\n');
  const last = index === close;
  if (last && starts.length) {
    // The previous last member now has a neighbour.
    lines[close - 1] = `${lines[close - 1].replace(/\s*$/, '')},`;
  } else if (!last) {
    body[body.length - 1] = `${body[body.length - 1].replace(/\s*$/, '')},`;
  }
  lines.splice(index, 0, ...body);
  return lines.join('\n');
}

/** The first and last line index of the entry `key` in the object at `path`. */
function findEntry(lines, path, key) {
  const opening = findObject(lines, path);
  if (opening === null) return null;
  const close = closingOf(lines, opening);
  if (close === -1) return null;
  const match = new RegExp(`^\\s*${quote(key)}\\s*:`);
  const start = lines.findIndex((line, i) => i > opening && i < close && match.test(line));
  if (start === -1) return null;
  // A one-line entry — a string, a number, a short array or object — closes on
  // its own line, which is to say its brackets balance there. Anything else is
  // a block, and closes by indentation.
  const end = depthOf(lines[start]) === 0 ? start : closingOf(lines, start);
  return end === -1 ? null : [start, end];
}

/** The line index where the object at `path` opens. */
function findObject(lines, path) {
  // The root object: the file's opening brace.
  if (!path.length) return lines.findIndex((line) => line.trim().startsWith('{'));
  const segments = path;
  let from = 0;
  let to = lines.length;
  for (const [depth, key] of segments.entries()) {
    const match = new RegExp(`^\\s*${quote(key)}\\s*:`);
    const index = lines.findIndex((line, i) => i >= from && i < to && match.test(line));
    if (index === -1) return null;
    if (depth === segments.length - 1) return lines[index].includes('{') ? index : null;
    from = index + 1;
    to = closingOf(lines, index);
    if (to === -1) return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** Where an array stops fitting on one line and goes one member per line. */
const WIDTH = 100;

/**
 * Render `value` as an entry of an object, in the style these manifests are
 * written in: two-space indentation, and an array on one line while it fits.
 *
 * A plugin declares its manifest entry as an object, not as a blob of text, so
 * it stays readable and diffable — this is what turns that object back into
 * lines the file would have had if the entry had always been there. Removal
 * deletes the lines insertion added, so the file returns to its exact bytes
 * whatever this produces; matching the house style is what stops an installed
 * plugin looking like a foreign body.
 */
export function renderJsonEntry(key, value, depth = 1) {
  return `${'  '.repeat(depth)}${render(key)}: ${renderValue(value, depth)}`;
}

function renderValue(value, depth) {
  const pad = '  '.repeat(depth);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    const inline = `[${value.map((item) => renderValue(item, depth + 1)).join(', ')}]`;
    if (!inline.includes('\n') && pad.length + inline.length <= WIDTH) return inline;
    const members = value.map((item) => `${pad}  ${renderValue(item, depth + 1)}`);
    return `[\n${members.join(',\n')}\n${pad}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (!keys.length) return '{}';
    const members = keys.map((key) => renderJsonEntry(key, value[key], depth + 1));
    return `{\n${members.join(',\n')}\n${pad}}`;
  }
  return JSON.stringify(value);
}
