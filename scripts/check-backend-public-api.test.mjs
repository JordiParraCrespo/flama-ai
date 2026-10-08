/**
 * The public-API check, tested against packages built for the purpose.
 *
 * Running it over the repository only says the surfaces are clean today; it
 * cannot show that a leak would be caught. These fixtures emit real
 * declarations, so what is checked is what `tsc` puts in a `.d.ts`: a private
 * field's type is not emitted, a constructor parameter's is.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import {
  backendPackages,
  emitDeclarations,
  judge,
  packageOf,
  specifiersOf,
  surfaceImports,
} from './check-backend-public-api.mjs';

const roots = [];
after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** Write a package from a {path: contents} map; returns its directory. */
function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'flama-public-api-'));
  roots.push(dir);
  const all = {
    'package.json': JSON.stringify({ name: '@flama/backend-fixture' }),
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'CommonJS',
        moduleResolution: 'node',
        strict: true,
        skipLibCheck: true,
        rootDir: './src',
        outDir: './dist',
      },
      include: ['src'],
    }),
    ...files,
  };
  for (const [path, contents] of Object.entries(all)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), contents);
  }
  return dir;
}

const modules = (dir) =>
  [...new Set(surfaceImports(emitDeclarations(dir)).map(({ module }) => module))].sort();

test('packageOf keeps the scope and drops the subpath', () => {
  assert.equal(packageOf('@nestjs/common'), '@nestjs/common');
  assert.equal(packageOf('@aws-sdk/client-s3/dist-types/x'), '@aws-sdk/client-s3');
  assert.equal(packageOf('ioredis/built/Redis'), 'ioredis');
  assert.equal(packageOf('node:fs'), 'node');
});

test('specifiersOf reads imports, re-exports, import() types and type references', () => {
  const text = [
    '/// <reference types="node" />',
    "import { A } from 'a';",
    "export { B } from 'b';",
    "export declare const c: import('c').C;",
    "import d = require('d');",
  ].join('\n');
  assert.deepEqual(specifiersOf(text).sort(), ['a', 'b', 'c', 'd', 'node']);
});

test('a driver library in an exported signature is on the surface', () => {
  const dir = fixture({
    'src/index.ts': "export { Driver } from './driver';",
    'src/driver.ts': [
      "import type { Redis } from 'ioredis';",
      'export class Driver {',
      '  constructor(readonly client: Redis) {}',
      '}',
    ].join('\n'),
  });
  assert.deepEqual(modules(dir), ['ioredis']);
  const { refused } = judge('@flama/backend-fixture', surfaceImports(emitDeclarations(dir)), {
    allowed: {},
    baseline: {},
  });
  assert.deepEqual(
    refused.map(({ file, module }) => [file, module]),
    [['driver.d.ts', 'ioredis']],
  );
});

test('a private field keeps its library off the surface', () => {
  const dir = fixture({
    'src/index.ts': [
      "import type { Redis } from 'ioredis';",
      'export class Driver {',
      '  private client?: Redis;',
      '  get(): string { return String(this.client); }',
      '}',
    ].join('\n'),
  });
  assert.deepEqual(modules(dir), []);
});

test('a file the entry does not reach is not on the surface', () => {
  const dir = fixture({
    'src/index.ts': 'export const x = 1;',
    'src/internal.ts': "import type { Redis } from 'ioredis';\nexport type R = Redis;",
  });
  assert.deepEqual(modules(dir), []);
});

test('judge allows the framework, the workspace and Node, and its lists', () => {
  const imports = ['@nestjs/common', '@flama/shared', 'node', 'fs', 'zod', 'bullmq'].map(
    (module) => ({ file: 'index.d.ts', specifier: module, module }),
  );
  const { refused, stale } = judge('@flama/backend-x', imports, {
    allowed: { '@flama/backend-x': ['zod'] },
    baseline: { '@flama/backend-x': ['bullmq', 'nodemailer'] },
  });
  assert.deepEqual(refused, []);
  assert.deepEqual(stale, ['nodemailer']);
});

test('every backend package in the repository is found', () => {
  const names = backendPackages().map(({ name }) => name);
  assert.ok(names.includes('@flama/backend-cache'));
  assert.ok(names.every((name) => name.startsWith('@flama/backend-')));
});
