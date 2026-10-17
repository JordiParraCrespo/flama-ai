#!/usr/bin/env node
/**
 * Every package a project lists as a singleton resolves to exactly one
 * snapshot in that project's closure of pnpm-lock.yaml.
 *
 * A library that keeps module state (a React context, a store, an i18n
 * instance) breaks when the bundle holds two copies of it. pnpm installs one
 * copy per resolved snapshot, a version plus the peers it resolved against,
 * so one version can install twice under two peer suffixes. The list is
 * `singletons` in the project's own package.json (`apps/web`); the closure
 * follows workspace `link:`s, so a package the app imports counts. A listed
 * name the closure never reaches fails too: a check that cannot see a
 * package proves nothing about it.
 *
 *   node scripts/check-singletons.mjs                     # the checked-out lockfile
 *   node scripts/check-singletons.mjs --lockfile <path>   # another one, e.g. an older revision's
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, normalize, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

// `fileURLToPath`, not `.pathname`, for a checkout path with a space: see check-api-structure.mjs.
const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');

/** `@scope/name@1.0.0(peer@2)` → `@scope/name`. */
export function packageName(snapshotKey) {
  const at = snapshotKey.indexOf('@', 1);
  return at === -1 ? snapshotKey : snapshotKey.slice(0, at);
}

const IMPORTER_GROUPS = ['dependencies', 'devDependencies', 'optionalDependencies'];
const SNAPSHOT_GROUPS = ['dependencies', 'optionalDependencies'];
// Fields of a snapshot that carry no edge.
const SNAPSHOT_OTHER = ['optional', 'transitivePeerDependencies'];

const isMap = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/** The edges of `entry` under `groups`; a field or a shape it does not know throws. */
function edgesOf(where, entry, groups, others, version) {
  if (!isMap(entry)) throw new Error(`pnpm-lock.yaml: ${where} is not a mapping`);
  const edges = [];
  for (const [field, value] of Object.entries(entry)) {
    if (others.includes(field)) continue;
    if (!groups.includes(field) || !isMap(value)) {
      throw new Error(`pnpm-lock.yaml: ${where} has a field this does not read: ${field}`);
    }
    for (const [name, dependency] of Object.entries(value)) {
      const resolved = version(dependency);
      if (typeof resolved !== 'string') {
        throw new Error(`pnpm-lock.yaml: ${where}: ${field}.${name} has no version`);
      }
      edges.push({ name, version: resolved });
    }
  }
  return edges;
}

/**
 * The `importers` and `snapshots` sections of a v9 pnpm-lock.yaml, as data:
 *
 *   importers  path → [{ name, version }] across every dependency group
 *   snapshots  key  → [{ name, version }] across dependencies and optionalDependencies
 *
 * The document is read with `yaml`; it fails closed on a shape this does not
 * expect (a missing section, a field no edge comes from, a dependency with no
 * version) rather than skipping it. The other sections are not read.
 */
export function parseLockfile(text) {
  const document = parse(text);
  const section = (name) => {
    if (!isMap(document?.[name])) throw new Error(`pnpm-lock.yaml: no "${name}" section`);
    return Object.entries(document[name]);
  };
  const importers = new Map(
    section('importers').map(([path, entry]) => [
      path,
      edgesOf(`importer ${path}`, entry, IMPORTER_GROUPS, [], (dependency) => dependency?.version),
    ]),
  );
  const snapshots = new Map(
    section('snapshots').map(([key, entry]) => [
      key,
      edgesOf(
        `snapshot ${key}`,
        entry ?? {},
        SNAPSHOT_GROUPS,
        SNAPSHOT_OTHER,
        (version) => version,
      ),
    ]),
  );
  return { importers, snapshots };
}

/**
 * The snapshot a dependency entry points at. An alias (`string-width-cjs:
 * string-width@4.2.3`) names its target in the version; everything else is
 * `<name>@<version>`. A key the lockfile does not hold is an error.
 */
function snapshotKeyOf({ name, version }, snapshots) {
  const direct = `${name}@${version}`;
  if (snapshots.has(direct)) return direct;
  if (snapshots.has(version)) return version;
  throw new Error(`no snapshot for ${name}: ${version} in pnpm-lock.yaml`);
}

/**
 * Every listed singleton of `importer`, with each snapshot of it that the
 * importer's closure reaches. Pure, so the test can hand it any lockfile text.
 *
 * Returns [{ name, variants: [{ key, via }] }], one entry per listed name in
 * list order, where `via` is one chain of importers and snapshots that
 * reaches the variant. A clean result has exactly one variant per name.
 */
export function resolveSingletons({ lockfile, importer, singletons }) {
  const { importers: projects, snapshots } = parseLockfile(lockfile);
  if (!projects.has(importer)) throw new Error(`importer "${importer}" is not in pnpm-lock.yaml`);

  const found = new Map(singletons.map((name) => [name, new Map()]));
  const seen = new Map([[`importer:${importer}`, [importer]]]);
  const queue = [{ id: `importer:${importer}`, importer }];

  while (queue.length > 0) {
    const node = queue.shift();
    const via = seen.get(node.id);
    const edges =
      node.importer !== undefined ? projects.get(node.importer) : snapshots.get(node.key);

    for (const edge of edges) {
      if (edge.version.startsWith('link:')) {
        if (node.importer === undefined) continue; // a snapshot's link points outside the workspace graph
        // Lockfile paths are posix on every platform.
        const target = posix.normalize(
          posix.join(node.importer, edge.version.slice('link:'.length)),
        );
        const id = `importer:${target}`;
        if (!projects.has(target) || seen.has(id)) continue;
        seen.set(id, [...via, target]);
        queue.push({ id, importer: target });
        continue;
      }
      const key = snapshotKeyOf(edge, snapshots);
      const id = `snapshot:${key}`;
      if (seen.has(id)) continue;
      const chain = [...via, key];
      seen.set(id, chain);
      queue.push({ id, key });
      found.get(packageName(key))?.set(key, chain);
    }
  }

  return [...found].map(([name, variants]) => ({
    name,
    variants: [...variants].map(([key, chain]) => ({ key, via: chain })),
  }));
}

/** Every importer of the lockfile whose package.json lists singletons. */
function listedImporters(lockfile) {
  const { importers } = parseLockfile(lockfile);
  return [...importers.keys()].flatMap((importer) => {
    const manifest = join(root, importer, 'package.json');
    if (!existsSync(manifest)) return [];
    const { singletons } = JSON.parse(readFileSync(manifest, 'utf8'));
    return singletons ? [{ importer, singletons }] : [];
  });
}

function main() {
  const at = process.argv.indexOf('--lockfile');
  const lockfile = readFileSync(
    at === -1 ? join(root, 'pnpm-lock.yaml') : process.argv[at + 1],
    'utf8',
  );
  const listed = listedImporters(lockfile);
  if (listed.length === 0) {
    console.error('check:singletons: no workspace package.json lists `singletons`.');
    process.exit(2);
  }

  let failed = false;
  for (const { importer, singletons } of listed) {
    for (const { name, variants } of resolveSingletons({ lockfile, importer, singletons })) {
      if (variants.length === 1) {
        console.log(`${importer}: ${variants[0].key}`);
        continue;
      }
      failed = true;
      if (variants.length === 0) {
        console.error(
          `\n${importer}: ${name} is listed as a singleton, but nothing it uses installs it.`,
        );
        continue;
      }
      console.error(`\n${importer}: ${name} resolves to ${variants.length} installed copies:`);
      for (const { key, via } of variants) {
        console.error(`  ${key}\n    via ${via.slice(0, -1).join(' → ')}`);
      }
    }
  }
  if (!failed) return;
  console.error(
    '\nEach copy is a separate module instance in the bundle. Align what differs in the peer ' +
      'suffix (often a devDependency such as typescript, or a peer range) across the packages ' +
      'above, then run pnpm install. A name nothing installs is a typo or a stale entry in ' +
      '`singletons`.',
  );
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) main();
