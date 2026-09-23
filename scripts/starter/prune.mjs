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
 * `pnpm install` that refreshes the lockfile), --no-report (skip the list of
 * prose lines that still name what went).
 *
 * To start a project, `pnpm starter:init` is the front door: it asks what to
 * keep and what to add, then runs this and the plugin installer in order.
 *
 * Everything else stays, every time: this script, `features.json` and every
 * marker. `pnpm plugin:remove` is this script, and it finds a plugin's lines
 * by its fences.
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
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deleteJsonEntry, deleteJsonValueAt } from '../lib/json-text.mjs';
// The grammar only. Everything below — git, JSON, the filesystem, exiting —
// is this script's own, and stays here.
import {
  dropBlocks,
  identifierRegex,
  MarkerError,
  annotate as parseMarkers,
} from '../lib/markers.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const MANIFEST_PATH = join(HERE, 'features.json');
/** Never scanned for references: binary, generated, or the apparatus itself. */
const SCAN_SKIP = [
  /^pnpm-lock\.yaml$/,
  /^scripts\/starter\//,
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
 * The manifest: every optional feature this project has, whether it shipped
 * with the starter or arrived as a plugin.
 *
 * One catalog. An installed plugin writes its entry straight in here, which is
 * why this file and this script outlive a one-shot prune: removal *is* the
 * pruner, and the pruner reads this. A second, sidecar catalog was the
 * alternative, and it meant every check had to stay in lockstep with two files
 * while a finished project could install a plugin it could not then remove.
 */
function loadManifest() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
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

/** `dropBlocks`, reporting a malformed marker the same way. */
function dropBlocksReported(file, content, removed) {
  try {
    return dropBlocks(file, content, removed);
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
  const knownIds = new Set(Object.keys(manifest.features));

  const allPaths = [
    ...Object.values(manifest.features).flatMap((feature) => feature.paths),
    ...Object.keys(manifest.shared),
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
          Object.keys(edit.set ?? {}).some((key) => line.includes(`"${key}":`))),
    );

  // A JSON edit is only reversible if it is true. `set` carries the value a
  // key has, so an install can write it back — which makes that value a copy
  // of the file's, and a copy can drift: bump a dependency and the manifest
  // would restore the old version. So while the edit's owner is here, the
  // manifest has to agree with the file, value for value.
  for (const edit of jsonEdits) {
    if (edit.deleteKeys) {
      problems.push(
        `${edit.file}: "deleteKeys" names keys without their values, so nothing could put ` +
          'them back; declare them with "set"',
      );
      continue;
    }
    if (!existsSync(join(ROOT, edit.file))) continue;
    const target = edit.path.reduce(
      (node, key) => node?.[key],
      JSON.parse(readFileSync(join(ROOT, edit.file), 'utf8')),
    );
    const where = `${edit.file} → ${edit.path.join(' → ')}`;
    for (const value of edit.remove ?? []) {
      if (!Array.isArray(target) || !target.includes(value))
        problems.push(`features.json removes "${value}" from ${where}, which does not hold it`);
    }
    for (const [key, value] of Object.entries(edit.set ?? {})) {
      if (JSON.stringify(target?.[key]) !== JSON.stringify(value))
        problems.push(
          `features.json sets ${where} → "${key}" to ${JSON.stringify(value)}, but the file ` +
            `has ${JSON.stringify(target?.[key])}`,
        );
    }
  }

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
        // A block several features share has to read true for each of them
        // alone, because it stays until the last one goes: a `web|mobile`
        // line naming `apps/mobile` is stale the moment only `web` is left.
        const inner = stack.at(-1);
        if (inner && inner.ids.length > 1 && inner.ids.includes(owner.id) && !owner.neededBy) {
          if (regexes.some((re) => re.test(line))) {
            problems.push(
              `${file}:${index + 1}: names ${owner.id} inside a block it shares ` +
                `("flama:begin ${inner.ids.join('|')}"); give it a block of its own: ` +
                line.trim().slice(0, 80),
            );
          }
          return;
        }
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
function editJson(file, at, plan, dryRun) {
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
    // Scoped, always. An unscoped search takes the first match in the file,
    // and `"web"` is a feature key as well as a member of half the `neededBy`
    // lists — that is how you delete a feature when you meant a dependant.
    // A literal is either a member of the array at `at` or a key of the object
    // there; nothing else can be deleted from a JSON file.
    const next = deleteJsonValueAt(text, at, literal)?.text ?? deleteJsonEntry(text, at, literal);
    if (next === null || next === undefined) {
      fail(`${file}: could not find "${literal}" in ${at.join(' → ')}`);
    }
    text = next;
  }
  if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(json)) {
    fail(`${file}: editing the text did not produce the intended JSON`);
  }
  writeFileSync(path, text);
}

/**
 * Take the removed features out of the manifest.
 *
 * The manifest used to be allowed to go stale, because a one-shot prune
 * deleted it a moment later. It survives now, so it has to stay true: a
 * feature that is gone keeps no entry, a shared path whose last dependant left
 * keeps none either, and a path that still has dependants loses the ones that
 * went. Without this, `pnpm starter:check` is red after every prune — it was,
 * on the one path that used to keep the manifest, and nobody noticed because
 * nobody took that path.
 */
function dropFromManifest(features, shared, deleted, dryRun) {
  if (!existsSync(MANIFEST_PATH)) return;
  const original = readFileSync(MANIFEST_PATH, 'utf8');
  let text = original;

  for (const id of features) {
    const next = deleteJsonEntry(text, ['features'], id);
    if (next === null) fail(`features.json: no entry for "${id}" to remove`);
    text = next;
  }
  for (const path of shared) {
    const next = deleteJsonEntry(text, ['shared'], path);
    if (next === null) fail(`features.json: no shared entry for "${path}" to remove`);
    text = next;
  }
  // A kept feature can own a path inside a departing one's tree — `web` has a
  // slice of `e2e/`, `runner` a template under `helm/`. Those files are gone
  // now, so the entries that claim them have to let go. The install side
  // already works this way: a plugin records the paths that actually landed,
  // not the ones it hoped to.
  const inside = (path) => deleted.some((gone) => path === gone || path.startsWith(`${gone}/`));
  for (const [id, feature] of Object.entries(JSON.parse(text).features)) {
    for (const path of feature.paths) {
      if (!inside(path)) continue;
      const next = deleteJsonValueAt(text, ['features', id, 'paths'], path);
      if (next === null) fail(`features.json: "${id}" has no path "${path}" to drop`);
      text = next.text;
    }
  }

  // Whatever shared paths remain, the departed are no longer among their
  // dependants. A stale name here fails the honesty check on the next run.
  const gone = new Set(features);
  for (const [path, entry] of Object.entries(JSON.parse(text).shared)) {
    for (const dependant of entry.neededBy) {
      if (!gone.has(dependant)) continue;
      const next = deleteJsonValueAt(text, ['shared', path, 'neededBy'], dependant);
      if (next === null) fail(`features.json: shared "${path}" has no "${dependant}" to drop`);
      text = next.text;
    }
  }

  if (text === original) return;
  console.log(`  edit   ${relative(ROOT, MANIFEST_PATH)}`);
  if (!dryRun) writeFileSync(MANIFEST_PATH, text);
}

function prune(manifest, removedIds, options) {
  const { dryRun, install } = options;
  const { features, shared } = resolveRemoval(manifest, removedIds);
  const removed = new Set(features);
  const pathsToDelete = [...features.flatMap((id) => manifest.features[id].paths), ...shared];
  const scriptsToDrop = [
    ...features.flatMap((id) => manifest.features[id].scripts ?? []),
    ...shared.flatMap((path) => manifest.shared[path].scripts ?? []),
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
    const text = dropBlocksReported(file, content, removed);
    if (text === null) continue;
    console.log(`  edit   ${file}`);
    edited.push(file);
    if (!dryRun) writeFileSync(join(ROOT, file), text);
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

  // 3. The manifest itself, which now outlives the prune.
  dropFromManifest(features, shared, pathsToDelete, dryRun);

  // 4. JSON files that cannot carry markers.
  editJson(
    'package.json',
    ['scripts'],
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
    ['files', 'includes'],
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
    ['ignore'],
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
      edit.path,
      (json) => {
        // `path` is an array of keys, not a dotted string: some of the keys
        // these edits address are file paths, and a dot there is data.
        const parent = edit.path.slice(0, -1).reduce((node, key) => node?.[key], json);
        const key = edit.path.at(-1);
        const target = parent?.[key];
        if (target === undefined) return [];
        if (Array.isArray(target) && edit.remove) {
          const kept = target.filter((value) => !edit.remove.includes(value));
          if (kept.length === target.length) return [];
          parent[key] = kept;
          return target.filter((value) => !kept.includes(value));
        }
        // `set` declares the keys *and* their values, so an install can put
        // them back; here only the names matter. One declaration, read in
        // whichever direction the caller is going.
        const keys = Object.keys(edit.set ?? {});
        if (keys.length && typeof target === 'object') {
          const deleted = [];
          for (const name of keys) {
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

  // 5. Lockfile, then the repo's formatter over what was edited (a marker
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

  console.log('\nDone.');
  if (options.report) {
    const identifiers = [
      ...features.flatMap((id) => manifest.features[id].identifiers),
      ...shared.flatMap((path) => manifest.shared[path].identifiers),
    ];
    printMentions(mentions(identifiers));
  }
}

/**
 * Every line that still names one of `identifiers` — the prose a prune leaves.
 *
 * Code cannot name a removed feature outside its markers; `--check` sees to
 * that. Prose can, and deliberately is not held to the same rule: fencing a
 * sentence mid-paragraph breaks it, and rewording one takes judgment. What a
 * script can do is find every such line, so none is missed.
 */
export function mentions(identifiers) {
  const regexes = identifiers.map(identifierRegex);
  const found = new Map();
  for (const file of trackedFiles()) {
    if (/CHANGELOG\.md$/.test(file)) continue; // history stays history
    // The apparatus names features in general, not this project's.
    if (/^scripts\/(starter|plugins|lib)\//.test(file)) continue;
    if (!existsSync(join(ROOT, file))) continue;
    const buffer = readFileSync(join(ROOT, file));
    if (!isText(buffer)) continue;
    buffer
      .toString('utf8')
      .split('\n')
      .forEach((line, index) => {
        if (!regexes.some((re) => re.test(line))) return;
        if (!found.has(file)) found.set(file, []);
        found.get(file).push(`${index + 1}: ${line.trim().slice(0, 100)}`);
      });
  }
  return found;
}

export function printMentions(found) {
  if (!found.size) return;
  const total = [...found.values()].reduce((sum, lines) => sum + lines.length, 0);
  console.log(
    `\n${total} line(s) in ${found.size} file(s) still name what was removed. Code is clean;` +
      '\nthis is prose, and each line wants rewording rather than deleting:',
  );
  for (const [file, lines] of found) {
    console.log(`\n  ${file}`);
    for (const line of lines) console.log(`    ${line}`);
  }
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
    report: true,
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
    else if (arg === '--no-report') options.report = false;
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
