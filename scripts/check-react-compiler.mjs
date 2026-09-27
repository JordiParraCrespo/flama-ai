#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Lists the functions the React Compiler leaves uncompiled, and why.
 *
 * Every frontend app builds with the compiler on, and every one of them runs
 * it in a mode that never fails the build: a component or hook it cannot prove
 * safe ships as written, unmemoised, and nothing says so.
 *
 * - `apps/web` runs `react({ compiler: true })`, the oxc port of the compiler
 *   (`oxc-transform-react`) with `panicThreshold: 'none'`.
 * - `apps/mobile` runs `babel-plugin-react-compiler` through babel-preset-expo
 *   (`experiments.reactCompiler`), with `panicThreshold: 'NONE'` in production.
 *
 * `react-compiler-healthcheck` runs only the Babel compiler, with its own
 * options, and misses what the oxc port bails out on. So this runs, per app,
 * the same compiler its build runs, over every file that build compiles (its
 * own source and every workspace package it bundles: the bundler resolves the
 * workspace links to their real paths, which the `node_modules` exclusions do
 * not match), and prints what the compiler would have warned about.
 *
 * A bailout is not a bug on its own. It matters when the function sits on a
 * fast clock (a keystroke, a tick, a stream, a poll), where the memoisation it
 * lost is what was keeping the cost down; the `frontend-audit` skill judges
 * that. This script only makes them visible.
 *
 *   node scripts/check-react-compiler.mjs                 report, exit 0
 *   node scripts/check-react-compiler.mjs --app <app>     one app (e.g. apps/web)
 *   node scripts/check-react-compiler.mjs --json          the same, as JSON
 *   node scripts/check-react-compiler.mjs --strict        exit 1 when anything bails out
 *
 * Exit 2 when an app's compiler is not installed (`pnpm install` first).
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** What every app bundles: the kernel and the product package. */
const SHARED = ['packages/frontend/core/src', 'packages/frontend/consumer/src'];

/**
 * Each app, the compiler its build runs, and what that build compiles. The
 * compiler is resolved from the app's own `package.json`, so it is the version
 * the build uses.
 */
export const TARGETS = [
  // flama:begin web
  {
    app: 'apps/web',
    compiler: 'oxc',
    sources: [
      'apps/web/src',
      'packages/frontend/web/src',
      'packages/frontend/design-system/web/src',
      ...SHARED,
    ],
  },
  // flama:end web
  // flama:plugins compiler-targets
  // flama:begin mobile
  {
    app: 'apps/mobile',
    compiler: 'babel',
    sources: [
      'apps/mobile/app',
      'apps/mobile/features',
      'apps/mobile/lib',
      'packages/frontend/mobile/src',
      'packages/frontend/design-system/mobile/src',
      ...SHARED,
    ],
  },
  // flama:end mobile
];

// The Vite plugin's own filter: a file with no component or hook in it is not
// compiled. Babel's `infer` mode finds the same set on its own; the filter only
// saves it the parse.
const CODE_FILTER = /forwardRef|memo|\b(?:[A-Z]|use[A-Z0-9])/;
const SKIP = /(\.d\.ts|\.spec\.tsx?|\.test\.tsx?|routeTree\.gen\.ts)$|\/__tests__\//;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') yield* walk(path);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !SKIP.test(path)) yield path;
  }
}

function lineOf(source, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i += 1) if (source[i] === '\n') line += 1;
  return line;
}

/** oxc: the transform `@vitejs/plugin-react` runs, returning its diagnostics. */
async function oxcCompiler(require) {
  const { transform } = await import(require.resolve('oxc-transform-react'));
  return async (file, source) => {
    const result = await transform(file, source, {
      jsx: { runtime: 'automatic' },
      reactCompiler: {},
      sourcemap: false,
    });
    return result.errors.map((error) => {
      const label = error.labels?.[0];
      return {
        line: label ? lineOf(source, label.start) : null,
        reason: error.message.split('\n')[0],
        detail: label?.message ?? null,
      };
    });
  };
}

/** Babel: the plugin babel-preset-expo adds, with the options it passes. */
async function babelCompiler(require) {
  const babel = require(require.resolve('@babel/core'));
  const plugin = require(require.resolve('babel-plugin-react-compiler'));
  return async (file, source) => {
    const events = [];
    await babel.transformAsync(source, {
      filename: file,
      babelrc: false,
      configFile: false,
      code: false,
      // Metro parses TypeScript with legacy decorators on (the kernel's DI uses them).
      parserOpts: { plugins: ['typescript', 'jsx', 'decorators-legacy'] },
      plugins: [
        [
          plugin.default ?? plugin,
          {
            target: '19',
            panicThreshold: 'none',
            logger: { logEvent: (_filename, event) => events.push(event) },
          },
        ],
      ],
    });
    return events
      .filter((event) => event.kind === 'CompileError' || event.kind === 'PipelineError')
      .map((event) => {
        // A CompilerDiagnostic keeps its fields under `options`; the older
        // CompilerErrorDetail has them at the top.
        const diagnostic = event.detail?.options ?? event.detail ?? {};
        const first = diagnostic.details?.find((item) => item.loc) ?? null;
        const loc = first?.loc ?? diagnostic.loc ?? event.fnLoc;
        return {
          line: loc?.start?.line ?? null,
          reason: String(diagnostic.reason ?? event.data ?? event.kind).split('\n')[0],
          detail: first?.message ?? null,
        };
      });
  };
}

const COMPILERS = { oxc: oxcCompiler, babel: babelCompiler };

/** Loads a target's compiler, or null when the app's dependencies are not installed. */
export async function loadCompiler(target, root = ROOT) {
  try {
    const require = createRequire(join(root, target.app, 'package.json'));
    return await COMPILERS[target.compiler](require);
  } catch {
    return null;
  }
}

/** Every bailout in one target's sources, as `{ app, file, line, reason, detail }`. */
export async function scan(target, compile, root = ROOT) {
  const bailouts = [];
  let files = 0;
  for (const dir of target.sources) {
    for (const file of walk(join(root, dir))) {
      const source = readFileSync(file, 'utf8');
      if (!CODE_FILTER.test(source)) continue;
      files += 1;
      for (const found of await compile(file, source)) {
        bailouts.push({ app: target.app, file: relative(root, file), ...found });
      }
    }
  }
  return { app: target.app, compiler: target.compiler, files, bailouts };
}

async function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const strict = argv.includes('--strict');
  const only = argv.includes('--app') ? argv[argv.indexOf('--app') + 1] : null;
  const targets = TARGETS.filter(
    (target) => !only || target.app === only || target.app === `apps/${only}`,
  );
  if (targets.length === 0) {
    console.error(`No frontend app named ${only}; known: ${TARGETS.map((t) => t.app).join(', ')}`);
    process.exit(2);
  }

  const reports = [];
  const missing = [];
  for (const target of targets) {
    const compile = await loadCompiler(target);
    if (!compile) {
      missing.push(target.app);
      continue;
    }
    reports.push(await scan(target, compile));
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          apps: reports.map(({ app, compiler, files, bailouts }) => ({
            app,
            compiler,
            files,
            bailouts: bailouts.length,
          })),
          missing,
          bailouts: reports.flatMap((report) => report.bailouts),
        },
        null,
        2,
      ),
    );
  } else {
    for (const report of reports) {
      for (const found of report.bailouts) {
        const where = `${found.file}${found.line ? `:${found.line}` : ''}`;
        console.log(`${where}  ${found.reason}${found.detail ? ` — ${found.detail}` : ''}`);
      }
      const bailed = new Set(report.bailouts.map((found) => found.file)).size;
      console.log(
        `React Compiler (${report.app}, ${report.compiler}): ${report.files} files compiled, ${bailed} with a function left uncompiled (${report.bailouts.length} diagnostics).`,
      );
    }
    for (const app of missing) {
      console.error(`${app}: its React Compiler is not installed; run \`pnpm install\` first.`);
    }
  }
  if (missing.length > 0) process.exit(2);
  if (strict && reports.some((report) => report.bailouts.length > 0)) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
