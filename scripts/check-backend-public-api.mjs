#!/usr/bin/env node
/**
 * No driver library in a backend package's public API.
 *
 * A `packages/backend/*` package is the seam between the API and a library it
 * happens to run on: `CacheService` is the contract, ioredis is how one driver
 * keeps it. Once a signature the package exports names an ioredis or BullMQ
 * type, every caller is written against that library too, and swapping the
 * driver is a change across the API instead of inside the package. So the
 * surface a package exports may name the framework it is a part of (Nest,
 * zod), the workspace, Node, and the few libraries that are the point of that
 * package — and nothing else.
 *
 * "The surface" is read off the declarations `tsc` would emit for the package:
 * its `index.d.ts` and every declaration file that one reaches through a
 * relative import. A private field's type is not emitted, so a driver may hold
 * an ioredis client; a constructor parameter, a return type or a re-export is
 * emitted, and is checked. The declarations are emitted in memory from the
 * sources, so the check needs no build and sees the working tree as it is.
 *
 * `ALLOWED` is the list per package, with the reason for each entry. `BASELINE`
 * lists the imports already exported that the list would refuse: they pass,
 * and an entry that no longer matches anything fails, so the list only shrinks.
 *
 *   node scripts/check-backend-public-api.mjs           check every package
 *   node scripts/check-backend-public-api.mjs --list    print every library each surface names
 *
 * Run: pnpm check:public-api
 */
import { existsSync, readdirSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = join(ROOT, 'packages/backend');

/**
 * What any backend package may name. The Nest packages and rxjs are the
 * framework the packages plug into (a module returns a `DynamicModule`, an
 * interceptor an `Observable`); `@flama/*` is held to its own rules.
 */
const COMMON = ['@nestjs/common', '@nestjs/core', '@nestjs/config', 'rxjs'];

/**
 * What one package may name beyond `COMMON`, and why. A library goes here only
 * when it is the point of the package, not the driver behind it; the
 * pluggable packages (cache, email, queue, storage) have no entry.
 */
export const ALLOWED = {
  // Row scoping is applied to the caller's TypeORM query builders, which is
  // why `typeorm` is a peer dependency of the package.
  '@flama/backend-authz': ['typeorm'],
  // The request pipeline itself: zod schemas and the nestjs-zod DTOs and pipe
  // built on them, and the nestjs-pino/pino-http options the logging module
  // assembles for the app.
  '@flama/backend-core': ['zod', 'nestjs-zod', 'nestjs-pino', 'pino-http'],
  // The outbox is a TypeORM table written in the caller's transaction, and
  // oxide.ts's `Option` is the repository port's vocabulary.
  '@flama/backend-ddd': ['typeorm', 'oxide.ts'],
};

/**
 * Imports already exported that `ALLOWED` would refuse. Each is a breaking
 * change to remove, so it is listed here with its reason rather than fixed in
 * passing. An entry is `package → [module]`.
 */
export const BASELINE = {};

/** `@scope/name/sub` → `@scope/name`, `name/sub` → `name`, `node:fs` → `node:fs`. */
export function packageOf(specifier) {
  if (specifier.startsWith('node:')) return 'node';
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** Whether a module may appear in any package's surface whatever its lists say. */
function always(module) {
  return module === 'node' || builtinModules.includes(module) || module.startsWith('@flama/');
}

/** Every module specifier a declaration file names: imports, re-exports, `import("x")` types. */
export function specifiersOf(text, fileName = 'index.d.ts') {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const found = source.typeReferenceDirectives.map((ref) => ref.fileName);
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      found.push(node.moduleSpecifier.text);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      found.push(node.argument.literal.text);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      found.push(node.moduleReference.expression.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/**
 * The declarations `tsc` would emit for the package at `dir`, keyed by their
 * path relative to the output root (`index.d.ts`, `cache.service.d.ts`, …).
 */
export function emitDeclarations(dir) {
  const configPath = join(dir, 'tsconfig.json');
  const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  const outDir = join(dir, '.public-api');
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, dir, {
    declaration: true,
    emitDeclarationOnly: true,
    declarationMap: false,
    sourceMap: false,
    noEmit: false,
    noEmitOnError: false,
    outDir,
  });
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const files = new Map();
  program.emit(undefined, (fileName, text) => {
    if (fileName.endsWith('.d.ts')) files.set(relative(outDir, fileName), text);
  });
  return files;
}

/**
 * The bare-module specifiers the surface rooted at `index.d.ts` names, each
 * with the declaration file it was found in.
 */
export function surfaceImports(files, entry = 'index.d.ts') {
  const imports = [];
  const seen = new Set();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file) || !files.has(file)) continue;
    seen.add(file);
    for (const specifier of specifiersOf(files.get(file), file)) {
      if (specifier.startsWith('.')) {
        const base = posix.normalize(posix.join(posix.dirname(file), specifier));
        queue.push(`${base}.d.ts`, `${base}/index.d.ts`);
      } else {
        imports.push({ file, specifier, module: packageOf(specifier) });
      }
    }
  }
  return imports;
}

/**
 * Judge one package's surface. Returns the imports nothing allows, and the
 * baseline entries that no longer match any import.
 */
export function judge(name, imports, { allowed = ALLOWED, baseline = BASELINE } = {}) {
  const ok = new Set([...COMMON, ...(allowed[name] ?? [])]);
  const tolerated = new Set(baseline[name] ?? []);
  const named = new Set(imports.map(({ module }) => module));
  const refused = imports.filter(
    ({ module }) => !always(module) && !ok.has(module) && !tolerated.has(module),
  );
  const stale = [...tolerated].filter((module) => !named.has(module));
  return { refused, stale };
}

/** Every backend package that has an entry to check: `{ name, dir }`. */
export function backendPackages(root = BACKEND) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .filter(
      (dir) => existsSync(join(dir, 'src/index.ts')) && existsSync(join(dir, 'tsconfig.json')),
    )
    .map((dir) => ({ name: readName(dir), dir }));
}

function readName(dir) {
  return JSON.parse(ts.sys.readFile(join(dir, 'package.json')) ?? '{}').name ?? dir;
}

// Run as a script; imported by the test suite without any of this firing.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const list = process.argv.includes('--list');
  const problems = [];
  const packages = backendPackages();
  for (const { name, dir } of packages) {
    const imports = surfaceImports(emitDeclarations(dir));
    if (list) {
      const modules = [...new Set(imports.map(({ module }) => module))].sort();
      console.log(`${name}: ${modules.join(', ') || '(none)'}`);
      continue;
    }
    const { refused, stale } = judge(name, imports);
    for (const { file, specifier } of refused) {
      problems.push(
        `${name}: ${relative(ROOT, dir)}/src/${file.replace(/\.d\.ts$/, '.ts')} exports a type from "${specifier}". ` +
          'Keep the driver library behind the abstract service, or add it to ALLOWED with its reason.',
      );
    }
    for (const module of stale) {
      problems.push(
        `${name}: BASELINE lists "${module}", which the surface no longer names — delete the entry.`,
      );
    }
  }
  if (list) process.exit(0);
  if (problems.length > 0) {
    console.error(
      `Backend public API: ${problems.length} problem${problems.length === 1 ? '' : 's'}\n`,
    );
    for (const problem of problems) console.error(`  ✖ ${problem}`);
    console.error('\nSee .agents/rules/backend-packages.md');
    process.exit(1);
  }
  console.log(`Backend public API: ${packages.length} packages name no driver library.`);
}
