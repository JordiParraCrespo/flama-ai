#!/usr/bin/env node
/**
 * The API module contract, checked. `apps/api` is a Domain-Driven Hexagon, and
 * a hexagon only holds if every module is cut the same way — otherwise the
 * layer a file belongs to becomes a matter of taste, and taste drifts.
 *
 * One shape, for every module, with no empty directories: a directory is
 * required only once it has something to hold, but what it may hold, and what
 * that file may be called, is fixed.
 *
 *  - a module's root carries its wiring and nothing else: the module, its
 *    mappers, its DI tokens, its CASL resource
 *  - every other file lives in one of the layer directories below, and its
 *    name says which layer it is in
 *  - a use case is a directory under commands/ or queries/, and every file in
 *    it is named after it
 *  - there is no services/ bucket: a thing is domain logic, a port, an
 *    adapter, or a use case
 *  - an HTTP route is declared in a use-case controller, never anywhere else
 *  - a controller dispatches and maps; a handler orchestrates. Both have caps
 *
 * See apps/api/ARCHITECTURE.md. Run: pnpm check:api-structure
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const API_SRC = join(root, 'apps/api/src');
const errors = [];
const fail = (message) => errors.push(message);

/**
 * Directories under `apps/api/src` that are not modules: the composition root,
 * the schema history, and the test suites that span modules.
 */
const NON_MODULES = new Set(['config', 'database', 'migrations', '__tests__']);

const CONTROLLER_LINE_CAP = 110;
const HANDLER_LINE_CAP = 120;

/**
 * The layer directories a module may have, each with the file names it may
 * hold and the sub-directories it may nest. `files` are matched against the
 * basename; a directory with no entry here does not exist as far as the
 * contract is concerned.
 */
const LAYERS = {
  domain: {
    what: 'the pure domain: aggregates, value objects, domain events, errors, and the rules and types that need nothing but them',
    files: [/\.entity\.ts$/, /\.errors\.ts$/, /\.policy\.ts$/, /\.factory\.ts$/, /\.types\.ts$/],
    dirs: {
      'value-objects': { files: [/\.value-object\.ts$/] },
      events: { files: [/\.domain-event\.ts$/] },
      __tests__: { files: [/\.spec\.ts$/] },
    },
  },
  database: {
    what: 'persistence: the ORM model, the repository port and its TypeORM adapter',
    files: [/\.orm-entity\.ts$/, /\.repository\.port\.ts$/, /\.repository\.ts$/],
    dirs: { __tests__: { files: [/\.spec\.ts$/] } },
  },
  infrastructure: {
    what: 'outbound adapters for everything that is not the database: the port, its adapter, and the wiring that external system needs',
    files: [
      /\.port\.ts$/,
      /\.adapter\.ts$/,
      /\.gateway\.ts$/,
      /\.processor\.ts$/,
      /\.config\.ts$/,
      /\.util\.ts$/,
      /\.types\.ts$/,
    ],
    dirs: { __tests__: { files: [/\.spec\.ts$/] } },
  },
  commands: { slices: 'command' },
  queries: { slices: 'query' },
  application: {
    what: 'the work that needs ports but is not a use case: a *.factory.ts that builds something from them, a *.policy.ts that asserts a rule with them, a *.resolver.ts that answers what a request acts on',
    files: [/\.factory\.ts$/, /\.policy\.ts$/, /\.resolver\.ts$/],
    dirs: {
      'event-handlers': {
        what: 'what reacts to a domain event after it is committed',
        files: [/\.domain-event-handler\.ts$/],
      },
      __tests__: { files: [/\.spec\.ts$/] },
    },
  },
  dtos: {
    what: 'the response contracts this module publishes',
    files: [/\.response\.dto\.ts$/],
    dirs: {},
  },
  guards: {
    what: 'inbound adapters that admit or refuse a request',
    files: [/\.guard\.ts$/],
    dirs: { __tests__: { files: [/\.spec\.ts$/] } },
  },
  decorators: {
    what: 'inbound adapters that read a request or attach route metadata',
    files: [/\.decorator\.ts$/],
    dirs: { __tests__: { files: [/\.spec\.ts$/] } },
  },
  interceptors: {
    what: 'inbound adapters that wrap a request',
    files: [/\.interceptor\.ts$/],
    dirs: { __tests__: { files: [/\.spec\.ts$/] } },
  },
  __tests__: {
    what: "tests for the module's own wiring",
    files: [/\.spec\.ts$/],
    dirs: {},
  },
};

/** The files a module's root may carry, and what each one is for. */
const ROOT_FILES = [
  { pattern: /\.module\.ts$/, what: 'the NestJS module' },
  { pattern: /\.mapper\.ts$/, what: 'a mapper between domain, persistence and response' },
  { pattern: /\.di-tokens\.ts$/, what: 'the injection tokens the ports are bound to' },
  { pattern: /\.resource\.ts$/, what: 'the CASL resource this module owns' },
];

/**
 * Directory names that used to mean "somewhere to put this", each with the
 * question the contract asks instead.
 */
const DISSOLVED_DIRS = {
  services:
    'a service is not a layer. Pure rules go in domain/ as a *.policy.ts or *.factory.ts; a call to something outside the process is a port plus an adapter in infrastructure/; anything a route reaches is a use case under commands/ or queries/',
  entities:
    'a persistence model is database/*.orm-entity.ts and a domain entity is domain/*.entity.ts — which one it is has to be visible from its path',
  dto: 'response contracts go in dtos/; a request DTO belongs to the use-case slice that receives it',
  utils:
    'a helper belongs to the layer that needs it — infrastructure/*.util.ts, or domain/ if it is a rule',
  helpers:
    'a helper belongs to the layer that needs it — infrastructure/*.util.ts, or domain/ if it is a rule',
  common: 'nothing is common to a module; name the layer it belongs to',
  types: 'a type lives with the thing it describes, or in @flama/shared when two sides need it',
  interfaces:
    'an interface that the inside depends on is a port: database/*.repository.port.ts or infrastructure/*.port.ts',
  constants: 'a constant lives with the thing it configures',
  models: 'a persistence model is database/*.orm-entity.ts; a domain model is domain/*.entity.ts',
  providers: 'a provider is registered in the module and defined in the layer it belongs to',
  controllers:
    'a controller belongs to the one use case it serves, under commands/<use-case>/ or queries/<use-case>/',
};

const HTTP_METHOD = /^\s*@(Get|Post|Put|Patch|Delete|All|Head|Options)\s*\(/m;

/**
 * Known violations, waiting on a refactor. Each entry is the exact message the
 * check would print, so it names one file and one problem — a ledger, not a
 * carve-out: nothing else in these modules is excused, and a new violation in
 * them still fails.
 *
 * An entry that no longer matches is itself an error. The list cannot outlive
 * the debt it describes.
 *
 * `admin/` and `organizations/` are the pre-contract Better Auth façades:
 * a root-level service and multi-route controllers, from before a module that
 * owns no aggregate was expected to have a port and a slice per operation.
 * `health/` is the same shape at a much smaller scale. See
 * `apps/api/AGENTS.md` for what to do when you touch them.
 */
const LEDGER = [
  'apps/api/src/admin/admin.controller.ts: a controller serves exactly one use case and lives with it, as commands/<use-case>/<use-case>.http.controller.ts',
  'apps/api/src/admin/admin.mappers.ts: one mapper per aggregate, named for it — admin.mapper.ts, not a bag of functions',
  'apps/api/src/admin/admin.service.ts: a module has no service. Each thing it does is a use case under commands/<use-case>/ or queries/<use-case>/; what it calls out to is a port plus an adapter in infrastructure/',
  'apps/api/src/admin/dtos/admin.request.dto.ts: not a name dtos/ admits. It holds the response contracts this module publishes',
  'apps/api/src/admin/admin.controller.ts: declares an HTTP route outside a use-case controller. A route is the front door of one use case — put it in commands/<use-case>/ or queries/<use-case>/',
  'apps/api/src/health/health.controller.ts: a controller serves exactly one use case and lives with it, as commands/<use-case>/<use-case>.http.controller.ts',
  'apps/api/src/health/health.controller.ts: declares an HTTP route outside a use-case controller. A route is the front door of one use case — put it in commands/<use-case>/ or queries/<use-case>/',
  'apps/api/src/organizations/invitations.controller.ts: a controller serves exactly one use case and lives with it, as commands/<use-case>/<use-case>.http.controller.ts',
  'apps/api/src/organizations/members.controller.ts: a controller serves exactly one use case and lives with it, as commands/<use-case>/<use-case>.http.controller.ts',
  'apps/api/src/organizations/organizations.controller.ts: a controller serves exactly one use case and lives with it, as commands/<use-case>/<use-case>.http.controller.ts',
  'apps/api/src/organizations/workspaces.controller.ts: a controller serves exactly one use case and lives with it, as commands/<use-case>/<use-case>.http.controller.ts',
  'apps/api/src/organizations/invitations.service.ts: a module has no service. Each thing it does is a use case under commands/<use-case>/ or queries/<use-case>/; what it calls out to is a port plus an adapter in infrastructure/',
  'apps/api/src/organizations/organizations.service.ts: a module has no service. Each thing it does is a use case under commands/<use-case>/ or queries/<use-case>/; what it calls out to is a port plus an adapter in infrastructure/',
  'apps/api/src/organizations/workspaces.service.ts: a module has no service. Each thing it does is a use case under commands/<use-case>/ or queries/<use-case>/; what it calls out to is a port plus an adapter in infrastructure/',
  'apps/api/src/organizations/organization.mappers.ts: one mapper per aggregate, named for it — organization.mapper.ts, not a bag of functions',
  'apps/api/src/organizations/dtos/organization.request.dto.ts: not a name dtos/ admits. It holds the response contracts this module publishes',
  'apps/api/src/organizations/invitations.controller.ts: declares an HTTP route outside a use-case controller. A route is the front door of one use case — put it in commands/<use-case>/ or queries/<use-case>/',
  'apps/api/src/organizations/members.controller.ts: declares an HTTP route outside a use-case controller. A route is the front door of one use case — put it in commands/<use-case>/ or queries/<use-case>/',
  'apps/api/src/organizations/organizations.controller.ts: declares an HTTP route outside a use-case controller. A route is the front door of one use case — put it in commands/<use-case>/ or queries/<use-case>/',
  'apps/api/src/organizations/workspaces.controller.ts: declares an HTTP route outside a use-case controller. A route is the front door of one use case — put it in commands/<use-case>/ or queries/<use-case>/',
];

const tsFiles = (dir) => readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile());
const subDirs = (dir) => readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory());
const lineCount = (path) => readFileSync(path, 'utf8').split('\n').length;
const rel = (path) => relative(root, path);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

/** A directory that exists but holds no file is a placeholder, not a layer. */
function requireNonEmpty(dir, label) {
  const hasFile = [...walk(dir)].length > 0;
  if (!hasFile) {
    fail(`${label}: empty. A directory appears once it has something to hold — delete it`);
    return false;
  }
  return true;
}

/** Check the files directly inside a directory against the patterns it allows. */
function checkFiles(dir, label, patterns, hint) {
  for (const entry of tsFiles(dir)) {
    if (entry.name === 'index.ts') {
      fail(`${label}/index.ts: no barrels inside a module — importers name the file they need`);
      continue;
    }
    if (!patterns.some((pattern) => pattern.test(entry.name))) {
      fail(
        `${label}/${entry.name}: not a name ${label.split('/').pop()}/ admits. It holds ${hint}`,
      );
    }
  }
}

/** commands/<use-case>/ and queries/<use-case>/: the vertical slice. */
function checkSlices(dir, label, kind) {
  const [message, handler] =
    kind === 'command' ? ['.command.ts', '.service.ts'] : ['.query.ts', '.query-handler.ts'];
  const allowed =
    kind === 'command'
      ? ['.command.ts', '.service.ts', '.http.controller.ts', '.request.dto.ts']
      : ['.query.ts', '.query-handler.ts', '.http.controller.ts', '.request.dto.ts'];

  for (const entry of tsFiles(dir)) {
    fail(
      `${label}/${entry.name}: ${label.split('/').pop()}/ holds one directory per use case, not files. Move it into ${label}/<use-case>/`,
    );
  }

  for (const slice of subDirs(dir)) {
    const sliceDir = join(dir, slice.name);
    const sliceLabel = `${label}/${slice.name}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slice.name)) {
      fail(`${sliceLabel}: a use case is named in kebab-case after what it does (verb first)`);
    }
    if (!requireNonEmpty(sliceDir, sliceLabel)) continue;

    const names = tsFiles(sliceDir).map((e) => e.name);
    const has = (suffix) => names.includes(`${slice.name}${suffix}`);
    // A message and its handler come as a pair; either alone is a dead end.
    if (has(message) && !has(handler)) {
      fail(
        `${sliceLabel}: has ${slice.name}${message} but no ${slice.name}${handler} to handle it`,
      );
    }
    if (has(handler) && !has(message)) {
      fail(
        `${sliceLabel}: has ${slice.name}${handler} but no ${slice.name}${message} for it to handle`,
      );
    }
    // A slice is a use case: it is reached over HTTP, or it is the handler
    // something else dispatches. A slice that is neither is unreachable.
    if (!has('.http.controller.ts') && !has(handler)) {
      fail(
        `${sliceLabel}: neither a controller nor a handler — nothing can reach this slice. A controller-only slice is one that dispatches another slice's ${message.slice(1, -3)}`,
      );
    }
    for (const name of names) {
      const suffix = allowed.find((s) => name.endsWith(s));
      if (!suffix) {
        fail(
          `${sliceLabel}/${name}: a ${kind} slice holds only ${allowed.join(', ')} (and __tests__/)`,
        );
        continue;
      }
      if (name !== `${slice.name}${suffix}`) {
        fail(
          `${sliceLabel}/${name}: every file in a slice is named after the slice — expected ${slice.name}${suffix}`,
        );
      }
    }

    for (const sub of subDirs(sliceDir)) {
      if (sub.name !== '__tests__') {
        fail(`${sliceLabel}/${sub.name}: a slice is flat; its only sub-directory is __tests__/`);
        continue;
      }
      checkFiles(join(sliceDir, '__tests__'), `${sliceLabel}/__tests__`, [/\.spec\.ts$/], 'specs');
    }
  }
}

/** Walk a layer directory: its own files, then the sub-directories it allows. */
function checkLayer(dir, label, spec) {
  checkFiles(dir, label, spec.files, spec.what);
  for (const sub of subDirs(dir)) {
    const subSpec = spec.dirs[sub.name];
    const subLabel = `${label}/${sub.name}`;
    if (!subSpec) {
      const allowed = Object.keys(spec.dirs);
      fail(
        `${subLabel}: ${label.split('/').pop()}/ nests ${allowed.length ? allowed.join(', ') : 'nothing'} and nothing else`,
      );
      continue;
    }
    if (!requireNonEmpty(join(dir, sub.name), subLabel)) continue;
    checkFiles(join(dir, sub.name), subLabel, subSpec.files, subSpec.what ?? spec.what);
    for (const deeper of subDirs(join(dir, sub.name))) {
      fail(`${subLabel}/${deeper.name}: the layer directories are two deep at most`);
    }
  }
}

function checkModule(name) {
  const moduleDir = join(API_SRC, name);
  const label = `apps/api/src/${name}`;

  // Root: the module's wiring, and nothing that belongs to a layer.
  const rootFiles = tsFiles(moduleDir).map((e) => e.name);
  const moduleFiles = rootFiles.filter((f) => f.endsWith('.module.ts'));
  if (moduleFiles.length === 0) {
    fail(`${label}: no *.module.ts — a directory under src/ is a module or it is not a directory`);
  } else if (moduleFiles.length > 1) {
    fail(`${label}: ${moduleFiles.join(', ')} — one module per directory; split it or merge them`);
  }
  for (const file of rootFiles) {
    if (ROOT_FILES.some(({ pattern }) => pattern.test(file))) continue;
    if (file.endsWith('.mappers.ts')) {
      fail(
        `${label}/${file}: one mapper per aggregate, named for it — ${file.replace(/\.mappers\.ts$/, '.mapper.ts')}, not a bag of functions`,
      );
    } else if (file.endsWith('.service.ts')) {
      fail(
        `${label}/${file}: a module has no service. Each thing it does is a use case under commands/<use-case>/ or queries/<use-case>/; what it calls out to is a port plus an adapter in infrastructure/`,
      );
    } else if (file.endsWith('.controller.ts')) {
      fail(
        `${label}/${file}: a controller serves exactly one use case and lives with it, as commands/<use-case>/<use-case>.http.controller.ts`,
      );
    } else {
      fail(
        `${label}/${file}: a module root carries only ${ROOT_FILES.map(({ pattern }) => `*${pattern.source.replace(/\\\./g, '.').replace(/\$$/, '')}`).join(', ')}. Everything else names the layer it is in`,
      );
    }
  }

  // Layers.
  for (const sub of subDirs(moduleDir)) {
    const subLabel = `${label}/${sub.name}`;
    const dissolved = DISSOLVED_DIRS[sub.name];
    if (dissolved) {
      fail(`${subLabel}: ${dissolved}`);
      continue;
    }
    const spec = LAYERS[sub.name];
    if (!spec) {
      fail(`${subLabel}: not a layer. A module holds ${Object.keys(LAYERS).join(', ')}`);
      continue;
    }
    if (!requireNonEmpty(join(moduleDir, sub.name), subLabel)) continue;
    if (spec.slices) checkSlices(join(moduleDir, sub.name), subLabel, spec.slices);
    else checkLayer(join(moduleDir, sub.name), subLabel, spec);
  }

  // Routes, and the caps that keep a controller a controller.
  for (const file of walk(moduleDir)) {
    if (!file.endsWith('.ts')) continue;
    const source = readFileSync(file, 'utf8');
    const inSlice = /\/(commands|queries)\/[^/]+\/[^/]+\.http\.controller\.ts$/.test(file);
    if (HTTP_METHOD.test(source) && !inSlice) {
      fail(
        `${rel(file)}: declares an HTTP route outside a use-case controller. A route is the front door of one use case — put it in commands/<use-case>/ or queries/<use-case>/`,
      );
    }
    if (inSlice && lineCount(file) > CONTROLLER_LINE_CAP) {
      fail(
        `${rel(file)}: ${lineCount(file)} lines; a controller dispatches and maps (cap ${CONTROLLER_LINE_CAP}). The work belongs in the handler`,
      );
    }
    if (
      /\/(commands|queries)\/[^/]+\/[^/]+\.(service|query-handler)\.ts$/.test(file) &&
      lineCount(file) > HANDLER_LINE_CAP
    ) {
      fail(
        `${rel(file)}: ${lineCount(file)} lines; a handler orchestrates (cap ${HANDLER_LINE_CAP}). Push the rules into the domain and the I/O behind a port`,
      );
    }
  }
}

if (!existsSync(API_SRC)) {
  console.log('API structure: apps/api is not part of this project.');
  process.exit(0);
}

const modules = readdirSync(API_SRC, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !NON_MODULES.has(e.name))
  .map((e) => e.name)
  .sort();

for (const name of modules) checkModule(name);

// Subtract the ledger, and hold the ledger to being current: an entry that no
// longer describes a real violation is debt that has been paid and not
// written off, and the next person reads it as still owed.
const ledger = new Set(LEDGER);
const outstanding = errors.filter((error) => !ledger.delete(error));
for (const stale of ledger) {
  outstanding.push(
    `LEDGER: "${stale}" no longer happens — delete that entry from LEDGER in scripts/check-api-structure.mjs`,
  );
}

if (outstanding.length > 0) {
  console.error(
    `API structure: ${outstanding.length} problem${outstanding.length === 1 ? '' : 's'}\n`,
  );
  for (const error of outstanding) console.error(`  ✖ ${error}`);
  console.error('\nSee apps/api/ARCHITECTURE.md');
  process.exit(1);
}
const owed = LEDGER.length;
console.log(
  `API structure: ${modules.length} modules conform` +
    (owed ? `, with ${owed} ledgered violations in admin/, organizations/ and health/.` : '.'),
);
