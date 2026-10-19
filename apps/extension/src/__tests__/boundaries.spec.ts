import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `chrome.*` is called from `src/runtime/`, and from the two programs that
 * are nothing but Chrome event wiring: the service worker and the content
 * script. Pages, features and providers go through the runtime's functions.
 *
 * What breaks if this fails: a feature that calls `chrome.tabs` directly
 * cannot be unit-tested without a browser, and the next person to need the
 * same call writes it a second, slightly different way. dependency-cruiser
 * cannot see this — `chrome` is a global, not an import.
 */
const SRC = path.resolve(import.meta.dirname, '..');
const ALLOWED = ['runtime', 'background', 'content', '__tests__'];

function* sources(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== '__tests__') yield* sources(full);
    } else if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts')) {
      yield full;
    }
  }
}

describe('the chrome boundary', () => {
  it('keeps chrome.* calls inside the runtime, the worker and the content script', () => {
    const offenders: string[] = [];
    for (const file of sources(SRC)) {
      const top = path.relative(SRC, file).split(path.sep)[0];
      if (ALLOWED.includes(top)) continue;
      const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      if (/\bchrome\.[a-z]/.test(code)) offenders.push(path.relative(SRC, file));
    }
    expect(offenders).toEqual([]);
  });
});
