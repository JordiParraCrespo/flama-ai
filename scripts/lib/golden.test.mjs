import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  deleteJsonEntry,
  deleteJsonValueAt,
  insertJsonEntry,
  insertJsonValue,
  readJsonEntry,
} from './json-text.mjs';
import { dropBlocks, narrowMarker, widenMarker } from './markers.mjs';

// One file per case, input and expected output side by side, the way Caddy
// keeps its adapter tests: a case is read as a whole, and adding one is
// adding a file. The format is `__golden__/README.md`.

const DIR = join(dirname(fileURLToPath(import.meta.url)), '__golden__');
const UPDATE = process.env.UPDATE_GOLDEN === '1';
const HEADER = /^=== (\w+)$/;
const RESULTS = ['output', 'at', 'null'];

const perLine = (text, edit) => text.split('\n').map(edit).join('\n');
const idSet = (ids) => new Set(ids);

/** Each op: the arguments its header may carry, and how to run it. */
const OPS = {
  dropBlocks: {
    args: ['removed', 'whole', 'slots'],
    run: ({ input }, { removed, whole = false, slots = {} }) =>
      dropBlocks('golden', input, idSet(removed), {
        whole: Array.isArray(whole) ? idSet(whole) : whole,
        slots: new Map(Object.entries(slots).map(([id, names]) => [id, idSet(names)])),
      }),
  },
  narrowMarker: {
    args: ['removed'],
    run: ({ input }, { removed }) => perLine(input, (line) => narrowMarker(line, idSet(removed))),
  },
  widenMarker: {
    args: ['id', 'at'],
    run: ({ input }, { id, at }) => perLine(input, (line) => widenMarker(line, id, at)),
  },
  deleteJsonValueAt: {
    args: ['path', 'literal'],
    run: ({ input }, { path, literal }) => deleteJsonValueAt(input, path, literal),
  },
  insertJsonValue: {
    args: ['path', 'literal', 'at'],
    run: ({ input }, { path, literal, at }) => insertJsonValue(input, path, literal, at),
  },
  readJsonEntry: {
    args: ['path', 'key'],
    run: ({ input }, { path, key }) => readJsonEntry(input, path, key),
  },
  deleteJsonEntry: {
    args: ['path', 'key'],
    run: ({ input }, { path, key }) => deleteJsonEntry(input, path, key),
  },
  insertJsonEntry: {
    args: ['path', 'at'],
    run: ({ input, entry }, { path, at }) => insertJsonEntry(input, path, entry, at),
  },
};

/**
 * A case file: `key: value` header lines, then `=== name` sections. `about`
 * and `op` are bare text, every other header value is JSON. A section's body
 * is the lines up to the next header; the newline before a header, or the one
 * ending the file, is the delimiter's, not the body's.
 */
function parse(name, source) {
  assert.ok(source.endsWith('\n'), `${name}: a case file ends with a newline`);
  const lines = source.slice(0, -1).split('\n');
  const header = {};
  const sections = {};
  let current = null;
  let results = lines.length;
  lines.forEach((line, index) => {
    const match = HEADER.exec(line);
    if (match) {
      current = match[1];
      assert.ok(!(current in sections), `${name}: section "${current}" appears twice`);
      sections[current] = [];
      if (RESULTS.includes(current) && results === lines.length) results = index;
    } else if (current) {
      sections[current].push(line);
    } else if (line.trim()) {
      const [, key, value] = /^(\w+):\s*(.*)$/.exec(line) ?? [];
      assert.ok(key, `${name}: "${line}" is not a header line`);
      header[key] = key === 'about' || key === 'op' ? value : JSON.parse(value);
    }
  });
  const prefix = `${lines.slice(0, results).join('\n')}\n`;
  const expected = results < lines.length ? `${lines.slice(results).join('\n')}\n` : '';
  const bodies = Object.fromEntries(
    Object.entries(sections).map(([key, body]) => [key, body.join('\n')]),
  );
  return { header, bodies, prefix, expected };
}

/** What a run returned, written as the result sections of a case file. */
function render(result, eol) {
  if (result === null) return '=== null\n';
  const text = typeof result === 'string' ? result : result.text;
  let out = `=== output\n${fromEol(text, eol)}\n`;
  if (typeof result === 'object') out += `=== at\n${result.at}\n`;
  return out;
}

/** A case written with `eol: "crlf"` runs on CRLF text; the file stays LF. */
function toEol(text, eol) {
  return eol === 'crlf' && text !== undefined ? text.replaceAll('\n', '\r\n') : text;
}

function fromEol(text, eol) {
  if (eol !== 'crlf') return text;
  assert.ok(!/\r(?!\n)|(?<!\r)\n/.test(text), 'a CRLF case came back with mixed line endings');
  return text.replaceAll('\r\n', '\n');
}

const files = readdirSync(DIR)
  .filter((file) => file.endsWith('.golden'))
  .sort();

test('the golden directory holds cases', () => {
  assert.ok(files.length > 0);
});

for (const file of files) {
  test(`golden: ${file}`, () => {
    const path = join(DIR, file);
    const { header, bodies, prefix, expected } = parse(file, readFileSync(path, 'utf8'));
    const { about, op, eol, ...args } = header;
    assert.ok(about, `${file}: say what the case is for in an "about" line`);
    const spec = OPS[op];
    assert.ok(spec, `${file}: unknown op "${op}"`);
    for (const key of Object.keys(args)) {
      assert.ok(spec.args.includes(key), `${file}: ${op} takes no "${key}"`);
    }
    assert.ok('input' in bodies, `${file}: no "=== input" section`);
    const actual = render(
      spec.run({ input: toEol(bodies.input, eol), entry: toEol(bodies.entry, eol) }, args),
      eol,
    );
    if (UPDATE) {
      writeFileSync(path, prefix + actual);
      return;
    }
    assert.equal(actual, expected, `${file}: run with UPDATE_GOLDEN=1 to accept the new output`);
  });
}
