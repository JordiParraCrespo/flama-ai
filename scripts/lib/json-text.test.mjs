import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  deleteJsonEntry,
  deleteJsonValue,
  deleteJsonValueAt,
  insertJsonEntry,
  insertJsonValue,
  readJsonEntry,
  renderJsonEntry,
} from './json-text.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('deleteJsonValue takes a value off its own line, and the comma above it', () => {
  const text = '{\n  "ignore": [\n    "@scope/alpha",\n    "@scope/beta"\n  ]\n}';
  assert.equal(deleteJsonValue(text, '@scope/beta'), '{\n  "ignore": [\n    "@scope/alpha"\n  ]\n}');
  assert.equal(deleteJsonValue(text, '@scope/alpha'), '{\n  "ignore": [\n    "@scope/beta"\n  ]\n}');
});

test('deleteJsonValue takes a value out of an array written on one line', () => {
  // The shape turbo.json keeps: the value is mid-line, and one of its
  // neighbours is a superstring of it.
  const outputs = '  "outputs": ["dist/**", ".next/**", "!.next/cache/**", "build/**"]';
  assert.equal(
    deleteJsonValue(outputs, '.next/**'),
    '  "outputs": ["dist/**", "!.next/cache/**", "build/**"]',
  );
  // Last member: it takes the comma before it instead.
  assert.equal(deleteJsonValue('  "env": ["VITE_*", "EXPO_*"],', 'EXPO_*'), '  "env": ["VITE_*"],');
  assert.equal(deleteJsonValue('  "env": ["VITE_*"],', 'VITE_*'), '  "env": [],');
});

test('deleteJsonValue reports a value it cannot find rather than guessing', () => {
  assert.equal(deleteJsonValue('  "env": ["VITE_*"],', 'NOPE_*'), null);
});

test('insertJsonValue is the inverse of deleteJsonValue, inline and expanded', () => {
  const inline = '{\n  "a": {\n    "env": ["VITE_*", "EXPO_*", "GO_*"]\n  }\n}';
  for (const [index, value] of [
    [0, 'VITE_*'],
    [1, 'EXPO_*'],
    [2, 'GO_*'],
  ]) {
    const without = deleteJsonValue(inline, value);
    assert.equal(insertJsonValue(without, ['a', 'env'], value, index), inline, `inline ${value}`);
  }

  const expanded = '{\n  "ignore": [\n    "@scope/alpha",\n    "@scope/beta",\n    "@scope/gamma"\n  ]\n}';
  for (const [index, value] of [
    [0, '@scope/alpha'],
    [1, '@scope/beta'],
    [2, '@scope/gamma'],
  ]) {
    const without = deleteJsonValue(expanded, value);
    assert.equal(insertJsonValue(without, ['ignore'], value, index), expanded, `expanded ${value}`);
  }
});

test('insertJsonValue fills an array the last delete emptied', () => {
  assert.equal(insertJsonValue('{\n  "env": []\n}', ['env'], 'VITE_*', 0), '{\n  "env": ["VITE_*"]\n}');
});

test('insertJsonValue refuses a path or a position it cannot honour', () => {
  assert.equal(insertJsonValue('{\n  "env": ["A"]\n}', ['nope'], 'B', 0), null);
  assert.equal(insertJsonValue('{\n  "env": ["A"]\n}', ['env'], 'B', 5), null);
});

test('a JSON entry survives being read out and put back', () => {
  const text = [
    '{',
    '  "features": {',
    '    "alpha": {',
    '      "identifiers": ["apps/alpha", "@scope/alpha"],',
    '      "paths": ["apps/alpha"]',
    '    },',
    '    "gamma": {',
    '      "identifiers": ["apps/gamma"],',
    '      "paths": ["apps/gamma"]',
    '    }',
    '  }',
    '}',
  ].join('\n');

  const entry = readJsonEntry(text, ['features'], 'gamma');
  assert.match(entry, /"gamma": \{/);
  assert.doesNotMatch(entry, /\},$/);

  const without = deleteJsonEntry(text, ['features'], 'gamma');
  assert.equal(JSON.parse(without).features.gamma, undefined);
  assert.deepEqual(Object.keys(JSON.parse(without).features), ['alpha']);
  assert.equal(insertJsonEntry(without, ['features'], entry), text);
});

test('an entry removed from the middle leaves the rest well-formed', () => {
  const text = [
    '{',
    '  "features": {',
    '    "alpha": { "paths": ["apps/alpha"] },',
    '    "gamma": { "paths": ["apps/gamma"] },',
    '    "delta": { "paths": ["delta"] }',
    '  }',
    '}',
  ].join('\n');
  const without = deleteJsonEntry(text, ['features'], 'gamma');
  assert.deepEqual(Object.keys(JSON.parse(without).features), ['alpha', 'delta']);
  // Reinserted last, because order here is not semantic.
  const back = insertJsonEntry(without, ['features'], readJsonEntry(text, ['features'], 'gamma'));
  assert.deepEqual(Object.keys(JSON.parse(back).features), ['alpha', 'delta', 'gamma']);
});

test('the real features.json round-trips through an entry and a neededBy join', () => {
  const path = join(ROOT, 'scripts', 'starter', 'features.json');
  const text = readFileSync(path, 'utf8');
  const manifest = JSON.parse(text);

  // Every feature, out and back: the file has to come back byte-identical or
  // installing a plugin and removing it would not.
  for (const id of Object.keys(manifest.features)) {
    const entry = readJsonEntry(text, ['features'], id);
    assert.ok(entry, `no entry for ${id}`);
    const without = deleteJsonEntry(text, ['features'], id);
    assert.equal(JSON.parse(without).features[id], undefined, id);
    const back = insertJsonEntry(without, ['features'], entry);
    assert.deepEqual(JSON.parse(back).features[id], manifest.features[id], id);
  }

  // Every shared path's dependant list, each member out and back. Scoped:
  // a feature key can also be a member of half these lists.
  for (const [sharedPath, entry] of Object.entries(manifest.shared)) {
    const path = ['shared', sharedPath, 'neededBy'];
    for (const dependant of entry.neededBy) {
      const removed = deleteJsonValueAt(text, path, dependant);
      assert.ok(removed, `${sharedPath} has no "${dependant}"`);
      assert.equal(insertJsonValue(removed.text, path, dependant, removed.at), text, sharedPath);
    }
  }
});

test('an entry rendered from its object is the entry the file already had', () => {
  // What lets a plugin declare its manifest entry as JSON rather than as a
  // blob of text: if rendering reproduces what the starter wrote, an installed
  // entry is indistinguishable from a hand-written one.
  const path = join(ROOT, 'scripts', 'starter', 'features.json');
  const text = readFileSync(path, 'utf8');
  const manifest = JSON.parse(text);

  for (const section of ['features', 'shared']) {
    for (const [key, value] of Object.entries(manifest[section])) {
      assert.equal(renderJsonEntry(key, value, 2), readJsonEntry(text, [section], key), key);
    }
  }
});

test('renderJsonEntry breaks an array only when it stops fitting', () => {
  assert.equal(renderJsonEntry('paths', ['a', 'b'], 0), '"paths": ["a", "b"]');
  const long = Array.from({ length: 8 }, (_, i) => `a-rather-long-path-number-${i}`);
  const rendered = renderJsonEntry('paths', long, 0);
  assert.match(rendered, /^"paths": \[\n/);
  assert.equal(rendered.split('\n').length, long.length + 2);
  assert.equal(renderJsonEntry('paths', [], 0), '"paths": []');
});

test('insertJsonEntry puts a member back where a reader expects it', () => {
  const text = [
    '{',
    '  "scripts": {',
    '    "build": "turbo build",',
    '    "test": "turbo test",',
    '    "release": "changeset publish"',
    '  }',
    '}',
  ].join('\n');

  // Out of the middle and back into the middle.
  const entry = readJsonEntry(text, ['scripts'], 'test');
  const without = deleteJsonEntry(text, ['scripts'], 'test');
  assert.equal(insertJsonEntry(without, ['scripts'], entry, 1), text);

  // Appended when no position is given, and still valid JSON.
  const appended = insertJsonEntry(without, ['scripts'], entry);
  assert.deepEqual(Object.keys(JSON.parse(appended).scripts), ['build', 'release', 'test']);

  // First.
  const first = insertJsonEntry(without, ['scripts'], entry, 0);
  assert.deepEqual(Object.keys(JSON.parse(first).scripts), ['test', 'build', 'release']);
});
