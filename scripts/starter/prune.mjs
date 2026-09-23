#!/usr/bin/env node
/**
 * Trim the starter down to the apps you are actually going to build.
 *
 * Flama ships eight optional features. A real project wants three of them, and
 * deleting the rest by hand leaves dead references in CI, compose, Helm and
 * `.env.example` — the mess this script exists to prevent. What the starter
 * does not ship is a plugin: `pnpm plugin:add <id>` installs one, and removing
 * it comes back here.
 *
 * The truth lives in `features.json` next to this file: each optional feature
 * lists the paths that go with it, and every other file that mentions it wraps
 * the lines in markers:
 *
 *   # flama:begin runner        (any comment syntax: #, //, <!-- -->)
 *   ...lines that exist only because of the runner...
 *   # flama:end runner
 *
 * A marker can name several features — `flama:begin mobile|mobile-showcase` —
 * and its block goes only when all of them go.
 *
 *   node scripts/starter/prune.mjs --without mobile,runner,mcp
 *   node scripts/starter/prune.mjs --keep web,mcp,e2e
 *   node scripts/starter/prune.mjs --check        # CI: manifest still honest?
 *   node scripts/starter/prune.mjs --list
 *
 * Flags: --dry-run (print the plan, touch nothing), --no-install (skip the
 * `pnpm install` that refreshes the lockfile), --keep-tooling (leave the
 * markers, this script and the /starter-init skill in place for a second pass;
 * by default a prune strips every marker and removes the starter apparatus).
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The grammar only. Everything below — git, JSON, the filesystem, exiting —
// is this script's own, and stays here.
import {
  identifierRegex,
  MarkerError,
  narrowMarker,
  annotate as parseMarkers,
} from '../lib/markers.mjs';
import { deleteJsonValue } from '../lib/json-text.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const MANIFEST_PATH = join(HERE, 'features.json');
/** What `pnpm plugin:add` installed, merged into the manifest at load. */
const INSTALLED_PATH = join(ROOT, '.flama-plugins.json');
/** Marker id for the starter apparatus itself (`flama:begin starter`). */
const TOOLING_ID = 'starter';
/** Never scanned for references: binary, generated, or the apparatus itself. */
const SCAN_SKIP = [
  /^pnpm-lock\.yaml$/,
  /^scripts\/starter\//,
  // The installed-plugin registry, like the manifest beside this script:
  // naming a feature is its whole job.
  /^\.flama-plugins\.json$/,
  /^\.agents\/skills\/starter-init\//,
  /\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|zip|pdf)$/i,
];
/**
 * `--check` covers machine-read files only. Prose (every Markdown file, the
 * changesets, changelogs) and comments are for the /starter-init skill to
 * rewrite after a prune — a script cannot fix a `└──` in a directory tree, and
 * wrapping every sentence in markers would make the docs unreadable.
 */
const CHECK_SKIP = [/\.md$/, /^\.changeset\//, /\.spec\.ts$/, /\.test\.ts$/];
const COMMENT_LINE_RE = /^\s*(?:#|\/\/|\/\*|\*|<!--|--|;)/;

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

/**
 * The starter's manifest, plus whatever `pnpm plugin:add` installed.
 *
 * An installed plugin is a feature this repo did not ship with, so it cannot
 * live in `features.json` — that file is the starter's, and rewriting it on
 * every install would churn a file the project owns. It lives in
 * `.flama-plugins.json` instead, in the same shape, and is merged here. From
 * that point the two are indistinguishable: the honesty check covers an
 * installed plugin, and `--without <id>` removes one.
 */
function loadManifest() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  if (existsSync(INSTALLED_PATH)) {
    const installed = JSON.parse(readFileSync(INSTALLED_PATH, 'utf8'));
    for (const [id, feature] of Object.entries(installed.features ?? {})) {
      if (manifest.features[id]) {
        fail(`.flama-plugins.json: "${id}" is already a feature of this starter`);
      }
      manifest.features[id] = feature;
    }
    // A plugin does not own a shared path, it joins the list of dependants.
    // Two shapes: a list of dependants joins a path this starter still has,
    // and an object carries the entry itself, for a path whose every
    // dependant was optional and left together — the control plane's domain
    // package belongs to both admin apps and to nothing else, so a starter
    // without them has no entry to join.
    for (const [path, value] of Object.entries(installed.shared ?? {})) {
      const carried = Array.isArray(value) ? null : value;
      const dependants = carried ? carried.neededBy : value;
      let entry = manifest.shared[path];
      if (!entry) {
        if (!carried) fail(`.flama-plugins.json: shared "${path}" is not in features.json`);
        entry = { identifiers: carried.identifiers ?? [], neededBy: [] };
        manifest.shared[path] = entry;
      }
      for (const id of dependants) {
        if (!entry.neededBy.includes(id)) entry.neededBy.push(id);
      }
    }
  }
  const features = manifest.features;
  for (const [id, feature] of Object.entries(features)) {
    for (const dep of feature.requires ?? []) {
      if (!features[dep]) fail(`features.json: "${id}" requires unknown feature "${dep}"`);
    }
  }
  for (const [path, entry] of Object.entries(manifest.shared)) {
    for (const dep of entry.neededBy) {
      if (!features[dep])
        fail(`features.json: shared "${path}" is needed by unknown feature "${dep}"`);
    }
  }
  return manifest;
}

/** `kept` plus everything it requires, transitively: what `--keep` really keeps. */
export function expandKeep(manifest, kept) {
  const set = new Set(kept);
  const queue = [...kept];
  while (queue.length) {
    for (const dep of manifest.features[queue.pop()].requires ?? []) {
      if (set.has(dep)) continue;
      console.warn(`  keeping ${dep} too: a kept feature requires it`);
      set.add(dep);
      queue.push(dep);
    }
  }
  return [...set];
}

/** Everything that goes when `removed` goes: dependants and orphaned shared paths. */
export function resolveRemoval(manifest, removed) {
  const set = new Set(removed);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [id, feature] of Object.entries(manifest.features)) {
      if (set.has(id)) continue;
      const lost = (feature.requires ?? []).find((dep) => set.has(dep));
      if (lost) {
        console.warn(`  ${id} requires ${lost}, so it goes too`);
        set.add(id);
        grew = true;
      }
    }
  }
  const shared = Object.entries(manifest.shared)
    .filter(([, entry]) => entry.neededBy.every((dep) => set.has(dep)))
    .map(([path]) => path);
  return { features: [...set], shared };
}

// ---------------------------------------------------------------------------
// Files and markers
// ---------------------------------------------------------------------------

function trackedFiles({ untracked = true } = {}) {
  const out = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', ...(untracked ? ['--others', '--exclude-standard'] : [])],
    {
      cwd: ROOT,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  return out
    .toString('utf8')
    .split('\0')
    .filter(
      (file) =>
        file &&
        existsSync(join(ROOT, file)) &&
        !lstatSync(join(ROOT, file)).isSymbolicLink() &&
        statSync(join(ROOT, file)).isFile(),
    )
    .filter((file) => !SCAN_SKIP.some((re) => re.test(file)));
}

function isText(buffer) {
  const sample = buffer.subarray(0, 8000);
  return !sample.includes(0);
}

/** `parseMarkers`, with a malformed marker reported the way this script reports
 * everything else: a message and exit 2. */
function annotate(file, content) {
  try {
    return parseMarkers(file, content);
  } catch (error) {
    if (error instanceof MarkerError) fail(error.message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// --check
// ---------------------------------------------------------------------------

function check(manifest) {
  const problems = [];
  const knownIds = new Set([...Object.keys(manifest.features), TOOLING_ID]);

  const allPaths = [
    ...Object.values(manifest.features).flatMap((feature) => feature.paths),
    ...Object.keys(manifest.shared),
    ...manifest.tooling.paths,
  ];
  for (const path of allPaths) {
    if (!existsSync(join(ROOT, path)))
      problems.push(`features.json lists "${path}", which does not exist`);
  }

  const owners = [
    ...Object.entries(manifest.features).map(([id, feature]) => ({
      id,
      paths: feature.paths,
      identifiers: feature.identifiers,
      requires: feature.requires ?? [],
    })),
    ...Object.entries(manifest.shared).map(([path, entry]) => ({
      id: path,
      paths: [path],
      identifiers: entry.identifiers,
      requires: [],
      neededBy: entry.neededBy,
    })),
  ];
  const ownerOf = (file) =>
    owners.find((owner) =>
      owner.paths.some((path) => file === path || file.startsWith(`${path}/`)),
    );

  const manifestScripts = new Set([
    ...Object.values(manifest.features).flatMap((feature) => feature.scripts ?? []),
    ...Object.values(manifest.shared).flatMap((entry) => entry.scripts ?? []),
    ...manifest.tooling.scripts,
  ]);
  const scriptLineRe = /^\s*"([^"]+)":/;
  // A JSON value or key the manifest removes itself counts as covered.
  const jsonEdits = [
    ...Object.values(manifest.features).flatMap((feature) => feature.json ?? []),
    ...Object.values(manifest.shared).flatMap((entry) => entry.json ?? []),
  ];
  const editedJsonLine = (file, line) =>
    jsonEdits.some(
      (edit) =>
        edit.file === file &&
        ((edit.remove ?? []).some((value) => line.includes(`"${value}"`)) ||
          (edit.deleteKeys ?? []).some((key) => line.includes(`"${key}":`))),
    );

  const files = trackedFiles();
  for (const file of files) {
    const buffer = readFileSync(join(ROOT, file));
    if (!isText(buffer)) continue;
    const content = buffer.toString('utf8');
    // Markers must be well-formed everywhere, prose included.
    const lines = annotate(file, content);
    for (const entry of lines) {
      if (!entry.marker) continue;
      for (const id of entry.stack.at(-1).ids) {
        if (!knownIds.has(id))
          problems.push(
            `${file}:${lines.indexOf(entry) + 1}: marker names unknown feature "${id}"`,
          );
      }
    }
    if (CHECK_SKIP.some((re) => re.test(file))) continue;

    const fileOwner = ownerOf(file);
    for (const owner of owners) {
      if (fileOwner && fileOwner.id === owner.id) continue;
      // A dependant may mention what it requires; a feature may mention the
      // shared packages it needs; a shared package may mention another shared
      // package that outlives it (its `neededBy` is a superset).
      if (fileOwner?.requires.includes(owner.id)) continue;
      if (
        owner.neededBy &&
        fileOwner &&
        !fileOwner.neededBy &&
        owner.neededBy.includes(fileOwner.id)
      )
        continue;
      if (owner.neededBy && fileOwner?.neededBy?.every((id) => owner.neededBy.includes(id)))
        continue;
      const regexes = owner.identifiers.map(identifierRegex);
      if (!regexes.length) continue;
      let inBlockComment = false;
      lines.forEach(({ line, stack, marker }, index) => {
        const wasInComment = inBlockComment;
        if (inBlockComment && line.includes('*/')) inBlockComment = false;
        else if (!inBlockComment && line.includes('/*') && !line.includes('*/'))
          inBlockComment = true;
        if (marker || wasInComment || COMMENT_LINE_RE.test(line)) return;
        // Shared paths are covered by the markers of the features that need them.
        const covered = stack.some(
          ({ ids }) => ids.includes(owner.id) || owner.neededBy?.some((id) => ids.includes(id)),
        );
        if (covered) return;
        if (file === 'package.json' && manifestScripts.has(scriptLineRe.exec(line)?.[1])) return;
        if (editedJsonLine(file, line)) return;
        if (regexes.some((re) => re.test(line))) {
          problems.push(
            `${file}:${index + 1}: mentions ${owner.id} outside a "flama:begin ${owner.neededBy ? owner.neededBy.join('|') : owner.id}" block: ${line.trim().slice(0, 100)}`,
          );
        }
      });
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// prune
// ---------------------------------------------------------------------------

/** Files rewritten by the current prune, formatted at the end. */
const edited = [];

/**
 * `plan(json)` returns the literal values and keys to delete. Nothing else in
 * the file is touched, and the result has to parse to the same thing mutating
 * the object would have produced — otherwise the surgery missed something and
 * this stops rather than write a file it cannot vouch for.
 */
function editJson(file, plan, dryRun) {
  const path = join(ROOT, file);
  if (!existsSync(path)) return;
  const original = readFileSync(path, 'utf8');
  const json = JSON.parse(original);
  const deletions = plan(json) ?? [];
  if (!deletions.length) return;
  console.log(`  edit   ${file}`);
  edited.push(file);
  if (dryRun) return;

  let text = original;
  for (const literal of deletions) {
    const next = deleteJsonValue(text, literal);
    if (next === null) fail(`${file}: could not find "${literal}"`);
    text = next;
  }
  if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(json)) {
    fail(`${file}: editing the text did not produce the intended JSON`);
  }
  writeFileSync(path, text);
}

function prune(manifest, removedIds, options) {
  const { dryRun, install, keepTooling } = options;
  const { features, shared } = resolveRemoval(manifest, removedIds);
  const removed = new Set(features);
  if (!keepTooling) removed.add(TOOLING_ID);
  const pathsToDelete = [
    ...features.flatMap((id) => manifest.features[id].paths),
    ...shared,
    ...(keepTooling ? [] : manifest.tooling.paths),
  ];
  const scriptsToDrop = [
    ...features.flatMap((id) => manifest.features[id].scripts ?? []),
    ...shared.flatMap((path) => manifest.shared[path].scripts ?? []),
    ...(keepTooling ? [] : manifest.tooling.scripts),
  ];
  const packageNames = [
    ...features.flatMap((id) =>
      manifest.features[id].identifiers.filter((x) => x.startsWith('@flama/')),
    ),
    ...shared.flatMap((path) =>
      manifest.shared[path].identifiers.filter((x) => x.startsWith('@flama/')),
    ),
  ];

  console.log(`\nRemoving: ${features.join(', ')}`);
  if (shared.length) console.log(`No longer needed: ${shared.join(', ')}`);
  console.log('');

  // 1. Marker blocks in every remaining file.
  const files = trackedFiles().filter(
    (file) => !pathsToDelete.some((path) => file === path || file.startsWith(`${path}/`)),
  );
  for (const file of files) {
    const buffer = readFileSync(join(ROOT, file));
    if (!isText(buffer)) continue;
    const content = buffer.toString('utf8');
    if (!content.includes('flama:begin')) continue;
    const out = [];
    let touched = false;
    for (const { line, stack, marker } of annotate(file, content)) {
      if (stack.length) touched = true;
      if (stack.some(({ ids }) => ids.every((id) => removed.has(id)))) continue;
      if (marker && !keepTooling) continue;
      out.push(marker ? narrowMarker(line, removed) : line);
    }
    if (!touched) continue;
    console.log(`  edit   ${file}`);
    edited.push(file);
    if (!dryRun) writeFileSync(join(ROOT, file), collapseBlankRuns(out.join('\n')));
  }

  // 2. Paths, then any directory the deletions left empty.
  for (const path of pathsToDelete) {
    if (!existsSync(join(ROOT, path))) continue;
    console.log(`  delete ${path}`);
    if (!dryRun) rmSync(join(ROOT, path), { recursive: true, force: true });
  }
  if (!dryRun) {
    for (const path of pathsToDelete) {
      let dir = dirname(path);
      while (
        dir !== '.' &&
        dir !== '' &&
        existsSync(join(ROOT, dir)) &&
        readdirSync(join(ROOT, dir)).length === 0
      ) {
        console.log(`  delete ${dir}/ (empty)`);
        rmSync(join(ROOT, dir), { recursive: true });
        dir = dirname(dir);
      }
    }
  }

  // 3. JSON files that cannot carry markers.
  editJson(
    'package.json',
    (json) => {
      const deleted = [];
      for (const name of scriptsToDrop) {
        if (json.scripts?.[name] !== undefined) {
          delete json.scripts[name];
          deleted.push(name);
        }
      }
      return deleted;
    },
    dryRun,
  );
  editJson(
    'biome.json',
    (json) => {
      const includes = json.files?.includes;
      if (!Array.isArray(includes)) return [];
      const kept = includes.filter((pattern) => {
        const literal = pattern.replace(/^!?\*\*\//, '').replace(/\/\*.*$/, '');
        if (!literal.includes('/') || literal.startsWith('.')) return true;
        return !pathsToDelete.some(
          (path) =>
            literal === path ||
            literal.startsWith(`${path}/`) ||
            (path.startsWith(`${literal}/`) && !existsSync(join(ROOT, literal))),
        );
      });
      if (kept.length === includes.length) return [];
      json.files.includes = kept;
      return includes.filter((pattern) => !kept.includes(pattern));
    },
    dryRun,
  );
  editJson(
    '.changeset/config.json',
    (json) => {
      if (!Array.isArray(json.ignore)) return [];
      const kept = json.ignore.filter((name) => !packageNames.includes(name));
      if (kept.length === json.ignore.length) return [];
      const removed = json.ignore.filter((name) => !kept.includes(name));
      json.ignore = kept;
      return removed;
    },
    dryRun,
  );
  // Manifest-declared edits: an array value or an object key that exists only
  // for a removed feature (turbo env pass-throughs, a pnpm override, a
  // dependency the kept API carried for a deleted app).
  const jsonEdits = [
    ...features.flatMap((id) => manifest.features[id].json ?? []),
    ...shared.flatMap((path) => manifest.shared[path].json ?? []),
  ];
  for (const edit of jsonEdits) {
    editJson(
      edit.file,
      (json) => {
        const segments = edit.path.split('.');
        const parent = segments.slice(0, -1).reduce((node, key) => node?.[key], json);
        const key = segments.at(-1);
        const target = parent?.[key];
        if (target === undefined) return [];
        if (Array.isArray(target) && edit.remove) {
          const kept = target.filter((value) => !edit.remove.includes(value));
          if (kept.length === target.length) return [];
          parent[key] = kept;
          return target.filter((value) => !kept.includes(value));
        }
        if (edit.deleteKeys && typeof target === 'object') {
          const deleted = [];
          for (const name of edit.deleteKeys) {
            if (name in target) {
              delete target[name];
              deleted.push(name);
            }
          }
          return deleted;
        }
        return [];
      },
      dryRun,
    );
  }
  // Pending changesets are a queued release, not history: one that names a
  // removed package breaks `changeset version`. Drop the package line, and the
  // whole changeset when nothing is left.
  for (const file of trackedFiles().filter(
    (f) => /^\.changeset\/.*\.md$/.test(f) && !f.endsWith('README.md'),
  )) {
    const content = readFileSync(join(ROOT, file), 'utf8');
    const match = /^---\n([\s\S]*?)\n---\n/.exec(content);
    if (!match) continue;
    const lines = match[1].split('\n');
    const kept = lines.filter(
      (line) =>
        !packageNames.some(
          (name) =>
            line.startsWith(`"${name}"`) ||
            line.startsWith(`'${name}'`) ||
            line.startsWith(`${name}:`),
        ),
    );
    if (kept.length === lines.length) continue;
    if (kept.every((line) => !line.trim())) {
      console.log(`  delete ${file} (only named removed packages)`);
      if (!dryRun) rmSync(join(ROOT, file));
      continue;
    }
    console.log(`  edit   ${file}`);
    if (!dryRun)
      writeFileSync(
        join(ROOT, file),
        `---\n${kept.join('\n')}\n---\n${content.slice(match[0].length)}`,
      );
  }

  if (dryRun) {
    console.log('\nDry run: nothing was changed.');
    return;
  }

  // 4. Lockfile, then the repo's formatter over what was edited (a marker
  // block removed from a list often leaves it on one line for Biome).
  if (install) {
    console.log('\npnpm install (refreshing the lockfile)...');
    execFileSync('pnpm', ['install'], { cwd: ROOT, stdio: 'inherit' });
  }
  if (edited.length) {
    try {
      execFileSync(
        'pnpm',
        ['exec', 'biome', 'format', '--write', '--files-ignore-unknown=true', ...edited],
        { cwd: ROOT, stdio: 'ignore' },
      );
    } catch {
      // Biome is a dev dependency; without an install there is nothing to run.
    }
  }

  // 5. What is left for a human (or the skill) to reconcile by hand.
  const identifiers = [
    ...features.flatMap((id) => manifest.features[id].identifiers),
    ...shared.flatMap((path) => manifest.shared[path].identifiers),
  ].map(identifierRegex);
  const leftovers = [];
  for (const file of trackedFiles({ untracked: false })) {
    if (/CHANGELOG\.md$/.test(file)) continue; // history stays history
    const buffer = readFileSync(join(ROOT, file));
    if (!isText(buffer)) continue;
    buffer
      .toString('utf8')
      .split('\n')
      .forEach((line, index) => {
        if (identifiers.some((re) => re.test(line)))
          leftovers.push(`${file}:${index + 1}: ${line.trim().slice(0, 100)}`);
      });
  }
  console.log('\nDone.');
  if (!keepTooling) {
    console.log(
      'Every flama:begin/end marker is gone, kept features included: the markers only served this prune.',
    );
  }
  if (leftovers.length) {
    console.log(
      `\n${leftovers.length} remaining mention(s) of removed features (prose to rewrite by hand):`,
    );
    for (const line of leftovers) console.log(`  ${line}`);
  }
  console.log(
    '\nNext: pnpm build && pnpm check && pnpm test, then rewrite AGENTS.md and README.md for the trimmed layout.',
  );
}

function collapseBlankRuns(text) {
  return text.replace(/\n{3,}/g, '\n\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    install: true,
    keepTooling: false,
    check: false,
    list: false,
    without: [],
    keep: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const next = argv[i + 1];
      if (!next) fail(`${arg} needs a value`);
      i += 1;
      return next
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    };
    if (arg === '--check') options.check = true;
    else if (arg === '--list') options.list = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--no-install') options.install = false;
    else if (arg === '--keep-tooling') options.keepTooling = true;
    else if (arg === '--without') options.without.push(...value());
    else if (arg.startsWith('--without=')) options.without.push(...arg.slice(10).split(','));
    else if (arg === '--keep') options.keep = value();
    else if (arg.startsWith('--keep=')) options.keep = arg.slice(7).split(',');
    else if (arg === '-h' || arg === '--help') {
      console.log(
        readFileSync(fileURLToPath(import.meta.url), 'utf8')
          .split('*/')[0]
          .split('\n')
          .slice(1)
          .map((l) => l.replace(/^ \* ?/, ''))
          .join('\n'),
      );
      process.exit(0);
    } else fail(`unknown argument ${arg}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = loadManifest();
  const ids = Object.keys(manifest.features);

  if (options.list) {
    for (const [id, feature] of Object.entries(manifest.features)) {
      const requires = feature.requires?.length
        ? `  (requires ${feature.requires.join(', ')})`
        : '';
      console.log(`${id.padEnd(16)} ${feature.summary}${requires}`);
    }
    return;
  }

  if (options.check) {
    const problems = check(manifest);
    if (problems.length) {
      console.error(`features.json is out of date (${problems.length} problem(s)):`);
      for (const problem of problems) console.error(`  ${problem}`);
      process.exit(1);
    }
    console.log(`features.json is honest: ${ids.length} features, every reference marked.`);
    return;
  }

  let removed;
  if (options.keep) {
    for (const id of options.keep)
      if (!ids.includes(id)) fail(`unknown feature "${id}" (see --list)`);
    const kept = expandKeep(manifest, options.keep);
    removed = ids.filter((id) => !kept.includes(id));
  } else if (options.without.length) {
    for (const id of options.without)
      if (!ids.includes(id)) fail(`unknown feature "${id}" (see --list)`);
    removed = options.without;
  } else {
    fail('nothing to do: pass --without <ids>, --keep <ids>, --check or --list');
  }
  if (!removed.length) fail('nothing to remove');

  prune(manifest, removed, options);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
