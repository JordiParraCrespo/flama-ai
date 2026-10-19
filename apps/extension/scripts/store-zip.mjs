#!/usr/bin/env node
/**
 * Packages `dist/` for the Chrome Web Store:
 * `release/flama-extension-<version>.zip`.
 *
 *   pnpm --filter @flama/extension build && pnpm --filter @flama/extension zip
 *
 * What the store gets differs from the unpacked build in two ways, both
 * required by the store and both checked here rather than remembered:
 *
 * - no `key` in the manifest — the store assigns the published id its own key,
 *   and refuses an upload that carries one;
 * - no source maps — they would publish the source, and the store would
 *   review them as code.
 *
 * It refuses a development build: one that would try to reach the reload
 * server on the reviewer's machine.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zip } from './zip.mjs';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(APP, 'dist');

function fail(message) {
  console.error(`zip: ${message}`);
  process.exit(1);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8'));
} catch {
  fail('no dist/manifest.json — run `pnpm --filter @flama/extension build` first');
}

const files = [];
for (const path of walk(DIST)) {
  const name = relative(DIST, path).split('\\').join('/');
  if (name.endsWith('.map')) continue;
  if (name === 'manifest.json') continue;
  const data = readFileSync(path);
  if (name === 'background.js' && data.includes('ws://localhost')) {
    fail('dist/ is a development build (it dials the reload server); run `build`, not `dev`');
  }
  files.push({ name, data });
}

const { key: _key, ...storeManifest } = manifest;
files.push({
  name: 'manifest.json',
  data: Buffer.from(`${JSON.stringify(storeManifest, null, 2)}\n`),
});

const out = join(APP, 'release', `flama-extension-${manifest.version}.zip`);
mkdirSync(dirname(out), { recursive: true });
const archive = zip(files);
writeFileSync(out, archive);
console.log(
  `zip: ${relative(APP, out)} — ${files.length} files, ${(archive.length / 1024).toFixed(1)} KB`,
);
