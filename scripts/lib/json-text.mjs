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
 * Delete a value from a JSON text.
 *
 * Sometimes it has its own line; sometimes the author kept the whole array on
 * one — `"outputs": ["dist/**", ".next/**", "build/**"]` — and then the value
 * has to come out of the middle of that line. Both shapes, and the comma each
 * leaves behind. Returns null when the value is not there.
 */
export function deleteJsonValue(text, literal) {
  const quoted = quote(literal);
  return (
    deleteOwnLine(text, new RegExp(`^\\s*${quoted}\\s*,?\\s*$`)) ??
    deleteOwnLine(text, new RegExp(`^\\s*${quoted}\\s*:`)) ??
    deleteInline(text, quoted)
  );
}

/** The value (or `"key": value` pair) occupies the line by itself. */
function deleteOwnLine(text, match) {
  const lines = text.split('\n');
  const index = lines.findIndex((line) => match.test(line));
  if (index === -1) return null;
  lines.splice(index, 1);
  const previous = index - 1;
  const next = lines[index]?.trim();
  if (previous >= 0 && lines[previous].trimEnd().endsWith(',') && /^[\]}]/.test(next ?? '')) {
    lines[previous] = lines[previous].replace(/,(\s*)$/, '$1');
  }
  return lines.join('\n');
}

/**
 * The value is one member of an array written on a single line. It takes the
 * comma that follows it, or — if it is last — the one before it, so the array
 * is still well-formed. The quotes in `quoted` are what keep `".next/**"` from
 * matching inside `"!.next/cache/**"`.
 */
function deleteInline(text, quoted) {
  for (const pattern of [
    new RegExp(`${quoted}\\s*,\\s*`),
    new RegExp(`\\s*,\\s*${quoted}`),
    new RegExp(quoted),
  ]) {
    const match = pattern.exec(text);
    if (match) return text.slice(0, match.index) + text.slice(match.index + match[0].length);
  }
  return null;
}

/**
 * Delete a value from the array at `path`, and report where it was.
 *
 * Scoped, unlike `deleteJsonValue`, which searches the whole file and takes
 * the first match — right for a literal that occurs once (a turbo output, a
 * biome pattern) and wrong for one that does not. `"web"` is a feature key in
 * `features.json` *and* a member of half its `neededBy` lists, so the
 * unscoped search deletes the feature.
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
 * The mirror of `deleteJsonValue` for an array member, and the reason a JSON
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

  // Inline: the whole array is on the line that opens it.
  if (isInline(lines[opening])) {
    const line = lines[opening];
    const start = line.indexOf('[');
    const end = line.indexOf(']', start);
    const members = splitMembers(line.slice(start + 1, end));
    if (at > members.length) return null;
    members.splice(at, 0, render(literal));
    lines[opening] = `${line.slice(0, start)}[${members.join(', ')}]${line.slice(end + 1)}`;
    return lines.join('\n');
  }

  // Expanded: one member per line until the closing bracket.
  const close = closingOf(lines, opening);
  if (close === -1) return null;
  const members = close - opening - 1;
  if (at > members) return null;
  const indent = indentOf(lines.slice(opening + 1, close), /\S/) ?? `${/^\s*/.exec(lines[opening])?.[0] ?? ''}  `;
  const index = opening + 1 + at;
  const last = at === members;
  lines.splice(index, 0, `${indent}${render(literal)}${last ? '' : ','}`);
  if (last && members > 0) lines[index - 1] = `${lines[index - 1].replace(/\s*$/, '')},`;
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

/** The line closing the block opened on `index`, by indentation. */
function closingOf(lines, index) {
  const indent = /^\s*/.exec(lines[index])?.[0] ?? '';
  for (let i = index + 1; i < lines.length; i++) {
    if (new RegExp(`^${indent}[}\\]]`).test(lines[i])) return i;
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
  return lines.join('\n');
}

/**
 * Append `entry` — the verbatim text `readJsonEntry` returned — to the object
 * at `path`, as its last member.
 *
 * Last rather than in its old position: order in these files is not semantic,
 * and appending is the one position that needs nothing recorded and cannot
 * drift as other entries come and go.
 */
export function insertJsonEntry(text, path, entry) {
  const lines = text.split('\n');
  const opening = findObject(lines, path);
  if (opening === null) return null;
  const close = closingOf(lines, opening);
  if (close === -1) return null;
  // The previous last member now has a neighbour.
  if (close - 1 > opening) {
    lines[close - 1] = `${lines[close - 1].replace(/\s*$/, '')},`;
  }
  lines.splice(close, 0, ...entry.split('\n'));
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
  // A one-line entry closes on its own line; a block closes by indentation.
  const end = /[}\]],?\s*$/.test(lines[start]) ? start : closingOf(lines, start);
  return end === -1 ? null : [start, end];
}

/** The line index where the object at `path` opens. */
function findObject(lines, path) {
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
