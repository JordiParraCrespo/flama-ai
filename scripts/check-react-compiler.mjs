#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASELINE } from './check-react-compiler.baseline.mjs';

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
 * A bailout is not a bug on its own: it matters when the function sits on a
 * fast clock (a keystroke, a tick, a stream, a poll), where the memoisation it
 * lost is what was keeping the cost down. So the check does not fail on every
 * bailout, only on a new one: `check-react-compiler.baseline.mjs` lists, per
 * app, the files that already bail out, and a file outside that list fails.
 * A listed file that no longer bails out is reported, so its line can go.
 * A file two apps compile (the kernel, the product package) is printed once,
 * with the apps it bails out in.
 *
 *   node scripts/check-react-compiler.mjs                 every app
 *   node scripts/check-react-compiler.mjs --app <app>     one app (e.g. apps/web or web)
 *   node scripts/check-react-compiler.mjs --json          the same, as JSON
 *
 * Exit 1 when a file outside the baseline bails out. Exit 2 when an app's
 * compiler is not installed (`pnpm install` first) — a checkout that installs
 * without an app's dependencies checks the others with `--app`.
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

/**
 * Every bailout across the scanned apps, one entry per file: the apps it bails
 * out in, whether each app's baseline lists it, and its diagnostics with the
 * repeats (same line, same reason) folded together.
 */
export function group(reports, baseline = BASELINE) {
  const files = new Map();
  for (const report of reports) {
    for (const found of report.bailouts) {
      let entry = files.get(found.file);
      if (!entry) {
        entry = { file: found.file, apps: [], unlisted: [], diagnostics: new Map() };
        files.set(found.file, entry);
      }
      if (!entry.apps.includes(found.app)) {
        entry.apps.push(found.app);
        if (!(baseline[found.app] ?? []).includes(found.file)) entry.unlisted.push(found.app);
      }
      const key = `${found.line}\u0000${found.reason}\u0000${found.detail}`;
      const diagnostic = entry.diagnostics.get(key);
      if (diagnostic) {
        diagnostic.count += 1;
        if (!diagnostic.apps.includes(found.app)) diagnostic.apps.push(found.app);
      } else {
        const { line, reason, detail } = found;
        entry.diagnostics.set(key, { line, reason, detail, count: 1, apps: [found.app] });
      }
    }
  }
  return [...files.values()]
    .map((entry) => ({ ...entry, diagnostics: [...entry.diagnostics.values()] }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

/** Baseline entries of the scanned apps that no longer bail out there: lines to delete. */
export function stale(reports, baseline = BASELINE) {
  return reports.flatMap((report) => {
    const bailed = new Set(report.bailouts.map((found) => found.file));
    return (baseline[report.app] ?? [])
      .filter((file) => !bailed.has(file))
      .map((file) => ({ app: report.app, file }));
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
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
  const files = group(reports);
  const unlisted = files.filter((entry) => entry.unlisted.length > 0);
  const gone = stale(reports);

  if (json) {
    console.log(
      JSON.stringify(
        {
          apps: reports.map(({ app, compiler, files: compiled, bailouts }) => ({
            app,
            compiler,
            files: compiled,
            bailouts: bailouts.length,
          })),
          missing,
          files,
          stale: gone,
        },
        null,
        2,
      ),
    );
  } else {
    for (const entry of files) {
      const status = entry.unlisted.length > 0 ? `NEW in ${entry.unlisted.join(', ')}` : 'baseline';
      console.log(`${entry.file}  [${entry.apps.join(', ')}] ${status}`);
      for (const found of entry.diagnostics) {
        const repeat = found.count > 1 ? ` (×${found.count})` : '';
        const apps = found.apps.length < entry.apps.length ? ` [${found.apps.join(', ')}]` : '';
        console.log(
          `  ${found.line ?? '?'}  ${found.reason}${found.detail ? ` — ${found.detail}` : ''}${repeat}${apps}`,
        );
      }
    }
    for (const report of reports) {
      const bailed = new Set(report.bailouts.map((found) => found.file)).size;
      console.log(
        `React Compiler (${report.app}, ${report.compiler}): ${report.files} files compiled, ${bailed} with a function left uncompiled.`,
      );
    }
    for (const { app, file } of gone) {
      console.log(
        `${file} no longer bails out in ${app}: delete it from scripts/check-react-compiler.baseline.mjs.`,
      );
    }
    if (unlisted.length > 0) {
      console.error(
        `${unlisted.length} file(s) newly left uncompiled. Rewrite the function so the compiler takes it (the diagnostic says what it refused), or, if the bailout is harmless where it runs, add the file to scripts/check-react-compiler.baseline.mjs and say why in the review.`,
      );
    }
    for (const app of missing) {
      console.error(
        `${app}: its React Compiler is not installed; run \`pnpm install\` first, or check the other apps with --app.`,
      );
    }
  }
  if (missing.length > 0) process.exit(2);
  if (unlisted.length > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
