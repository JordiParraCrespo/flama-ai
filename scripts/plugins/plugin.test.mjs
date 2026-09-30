import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkFences, featureEntry } from './ops.mjs';
import { parseArgs } from './plugin.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SCRIPT = join(HERE, 'plugin.mjs');

/** Run the installer and return what it printed, whether or not it succeeded. */
function run(...args) {
  try {
    return { code: 0, out: execFileSync('node', [SCRIPT, ...args], { encoding: 'utf8' }) };
  } catch (error) {
    return { code: error.status, out: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

test('featureEntry keeps the manifest key order and drops empty lists', () => {
  const entry = featureEntry({
    feature: {
      title: 'Widget',
      summary: 'apps/widget — a widget',
      identifiers: ['apps/widget'],
      paths: ['apps/widget'],
      requires: [],
      scripts: ['widget'],
    },
  });
  // `plugin` marks the entry as installed rather than shipped — the one thing
  // that tells the two apart now that they share features.json.
  assert.deepEqual(Object.keys(entry), [
    'title',
    'summary',
    'plugin',
    'identifiers',
    'paths',
    'slots',
    'scripts',
  ]);
  assert.equal(entry.plugin, true);
  assert.deepEqual(entry.scripts, ['widget']);
});

test('a block must name its plugin in both fences', () => {
  const ok = '# flama:begin widget\nX=\n# flama:end widget';
  assert.equal(checkFences('widget', '.env.example', ok), null);

  // Co-owned fences count: the block leaves with the last of its owners.
  const shared = '# flama:begin gadget|widget\nX=\n# flama:end gadget|widget';
  assert.equal(checkFences('widget', '.env.example', shared), null);

  // A fence naming someone else would survive `plugin:remove` untouched.
  const wrong = '# flama:begin gadget\nX=\n# flama:end gadget';
  assert.match(checkFences('widget', '.env.example', wrong), /flama:begin widget/);

  // A half-fenced block is worse than none: the pruner would take the file apart.
  const half = '# flama:begin widget\nX=';
  assert.match(checkFences('widget', '.env.example', half), /never closed/);
});

test('a fence naming a longer id does not count as this plugin', () => {
  const other = '# flama:begin widget-showcase\nX=\n# flama:end widget-showcase';
  assert.match(checkFences('widget', '.env.example', other), /flama:begin widget/);
});

test('parseArgs reads the command, the id and where to get the plugin', () => {
  const add = parseArgs(['add', 'cli', '--from', '../flama-ai-plugins']);
  assert.equal(add.command, 'add');
  assert.equal(add.id, 'cli');
  assert.equal(add.from, '../flama-ai-plugins');
  assert.equal(add.dryRun, false);

  // No --from means fetch, so there is always a repo and a ref to fetch from.
  const fetched = parseArgs(['add', 'cli']);
  assert.equal(fetched.from, null);
  assert.match(fetched.repo, /flama-ai-plugins/);
  assert.equal(fetched.ref, 'main');

  const pinned = parseArgs(['add', 'cli', '--repo', 'git@host:me/forked.git', '--ref', 'v2']);
  assert.equal(pinned.repo, 'git@host:me/forked.git');
  assert.equal(pinned.ref, 'v2');

  const dry = parseArgs(['remove', 'cli', '--dry-run', '--force']);
  assert.deepEqual(
    { command: dry.command, id: dry.id, dryRun: dry.dryRun, force: dry.force },
    { command: 'remove', id: 'cli', dryRun: true, force: true },
  );

  // A caller that installs several plugins installs once, itself.
  assert.equal(parseArgs(['add', 'cli']).install, true);
  assert.equal(parseArgs(['add', 'cli', '--no-install']).install, false);

  // `list` takes no id.
  assert.equal(parseArgs(['list']).command, 'list');
});

test('a value flag will not swallow the next flag', () => {
  // `--from --force` should be a usage error, not an install from a directory
  // named "--force". parseArgs exits rather than throwing, so run it for real.
  const { code, out } = run('add', 'cli', '--from', '--force');
  assert.equal(code, 2);
  assert.match(out, /--from needs a value/);
});

test('--from is relative to the repo root, not the working directory', () => {
  // The same argument has to mean the same thing wherever it is typed, or a
  // project installs from whatever happens to sit beside its cwd.
  const { code, out } = run('list', '--from', 'scripts/starter');
  assert.equal(code, 2);
  assert.match(out, /no plugins\/ directory in scripts\/starter/);
});

// ---------------------------------------------------------------------------
// The installer against a fixture project
// ---------------------------------------------------------------------------
//
// The round trip in the plugins repo proves a real plugin installs and
// uninstalls; it lives in another repository and runs against five real
// manifests. These cover the paths that used to fail by matching a stored
// block body — a `neededBy` join, a JSON edit in both directions, a co-owned
// widen — here, where the code is, on a project small enough to read.

/**
 * The apparatus, and only the apparatus: the installer, the pruner it shells
 * out to, and the two libraries they share.
 *
 * Not the whole `scripts/` tree. Every other script in it carries markers for
 * the real features — and this file names the fixture's ids in plain prose —
 * so copying them wholesale hands `--check` thirty complaints about a repo
 * that is not the one under test.
 */
const APPARATUS = [
  'scripts/plugins/plugin.mjs',
  'scripts/plugins/ops.mjs',
  'scripts/plugins/source.mjs',
  'scripts/starter/prune.mjs',
  'scripts/lib/markers.mjs',
  'scripts/lib/json-text.mjs',
];

/**
 * The environment the fixture's own installer runs in: this one, minus the
 * host repo's toolchain.
 *
 * A prune finishes by running Biome over what it edited, when Biome is there
 * to run. `pnpm test:scripts` puts this repo's `node_modules/.bin` on `PATH`,
 * so in CI it is — and the fixture has no `biome.json`, so Biome formats its
 * files to its own defaults and the round trip reads as broken. Locally, with
 * no install, the same test passed. The fixture is a project of its own and
 * gets none of the host's tools.
 */
const FIXTURE_ENV = {
  ...process.env,
  PATH: (process.env.PATH ?? '')
    .split(delimiter)
    .filter((entry) => !entry.includes('node_modules'))
    .join(delimiter),
};

/**
 * A git repo carrying this installer, a manifest, and files to edit.
 *
 * `pruned` is the project the evaluation found broken: the shared block's
 * other owner (`alpha`) was pruned and took the block with it, and another
 * feature's block (`gamma`) now sits right above the slot.
 */
function fixture({ pruned = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'flama-installer-'));
  for (const file of APPARATUS) {
    mkdirSync(join(dir, dirname(file)), { recursive: true });
    cpSync(join(ROOT, file), join(dir, file));
  }

  // Ids nothing in the copied apparatus mentions, so `--check` stays honest.
  writeFileSync(
    join(dir, 'scripts', 'starter', 'features.json'),
    `${JSON.stringify(
      {
        features: pruned
          ? { gamma: { title: 'Gamma', summary: 'gamma', identifiers: ['gamma-app'], paths: [] } }
          : {
              alpha: {
                title: 'Alpha',
                summary: 'alpha',
                identifiers: ['alpha-app'],
                paths: ['alpha'],
              },
            },
        shared: pruned ? {} : { kit: { identifiers: ['the-kit'], neededBy: ['alpha'] } },
      },
      null,
      2,
    )}\n`,
  );
  mkdirSync(join(dir, 'alpha'), { recursive: true });
  writeFileSync(join(dir, 'alpha', 'index.txt'), 'alpha\n');
  mkdirSync(join(dir, 'kit'), { recursive: true });
  writeFileSync(join(dir, 'kit', 'index.txt'), 'kit\n');
  const owned = pruned
    ? ['# flama:begin gamma', 'neighbour-line', '# flama:end gamma']
    : ['# flama:begin alpha', 'shared-line', '# flama:end alpha'];
  const config = [...owned, '# flama:plugins the-slot', ''].join('\n');
  writeFileSync(join(dir, 'config.txt'), config);
  writeFileSync(join(dir, 'slots.txt'), ['# flama:plugins own-slot', ''].join('\n'));
  const data = { list: ['a', 'c'], map: {} };
  writeFileSync(join(dir, 'data.json'), `${JSON.stringify(data, null, 2)}\n`);
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify({ scripts: {} }, null, 2)}\n`);

  execFileSync('git', ['init', '--quiet', dir]);
  execFileSync('git', ['-C', dir, 'add', '-A']);
  const who = ['-c', 'user.name=t', '-c', 'user.email=t@t'];
  execFileSync('git', ['-C', dir, ...who, 'commit', '-qm', 'x']);
  return dir;
}

/** A plugin source `--from` can read. */
function source(dir, manifest, blocks = {}) {
  const plugins = join(dir, 'plugins', manifest.id);
  mkdirSync(join(plugins, 'blocks'), { recursive: true });
  writeFileSync(join(plugins, 'plugin.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const [name, body] of Object.entries(blocks)) {
    writeFileSync(join(plugins, 'blocks', name), body);
  }
  return dir;
}

const BETA = {
  id: 'beta',
  feature: {
    title: 'Beta',
    summary: 'beta',
    identifiers: ['beta-app'],
    paths: ['beta'],
    shared: [{ path: 'kit', identifiers: ['the-kit'] }],
    json: [
      { file: 'data.json', path: ['list'], remove: ['b'], at: [1] },
      // A key of the file itself, as a translation namespace is.
      { file: 'data.json', path: [], set: { beta: { on: true } }, setAt: [1] },
      { file: 'package.json', path: ['scripts'], set: { beta: 'run beta' }, setAt: [0] },
      // A file the formatter lays out with every array broken says so.
      { file: 'package.json', path: [], set: { files: ['beta'] }, setAt: [1], expand: true },
    ],
  },
  files: { beta: 'files/beta' },
  blocks: [{ file: 'slots.txt', anchor: 'own-slot', source: 'blocks/own.txt' }],
  coOwned: [{ file: 'config.txt', anchor: 'the-slot', order: ['alpha', 'beta'] }],
};

/**
 * The installer finds the project from its own location, so the copy inside
 * the fixture is the one to run — the same way a real project runs its own.
 */
function install(project, extra = [], manifest = BETA) {
  const from = mkdtempSync(join(tmpdir(), 'flama-source-'));
  source(from, manifest, {
    'own.txt': '# flama:begin beta\nbeta-line\n# flama:end beta\n',
    'shared.txt': '# flama:begin beta\nshared-line\n# flama:end beta\n',
  });
  mkdirSync(join(from, 'plugins', 'beta', 'files', 'beta'), { recursive: true });
  writeFileSync(join(from, 'plugins', 'beta', 'files', 'beta', 'index.txt'), 'beta\n');
  // A copied file from a starter that had a feature this project may not.
  const notes = ['kept', '# flama:begin zeta', 'zeta-line', '# flama:end zeta', ''].join('\n');
  writeFileSync(join(from, 'plugins', 'beta', 'files', 'beta', 'notes.txt'), notes);
  const script = join(project, 'scripts', 'plugins', 'plugin.mjs');
  try {
    return {
      from,
      result: {
        code: 0,
        out: execFileSync(
          'node',
          [script, 'add', '--no-install', 'beta', '--from', from, ...extra],
          {
            encoding: 'utf8',
            env: FIXTURE_ENV,
          },
        ),
      },
    };
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    return { from, result: { code: error.status, out } };
  }
}

test('an install joins neededBy, edits JSON both ways, and widens the shared block', () => {
  const project = fixture();
  const { result } = install(project);
  assert.equal(result.code, 0, result.out);

  const catalog = join(project, 'scripts/starter/features.json');
  const manifest = JSON.parse(readFileSync(catalog, 'utf8'));
  // The entry landed, marked as a plugin's.
  assert.equal(manifest.features.beta.plugin, true);
  // A shared path is joined, not owned: alpha keeps it too.
  assert.deepEqual(manifest.shared.kit.neededBy, ['alpha', 'beta']);
  // The blocks it put on a slot are recorded, so its removal takes those out
  // whole and knows every other fence of its is a hole to keep.
  assert.deepEqual(manifest.features.beta.slots, {
    'config.txt': ['the-slot'],
    'slots.txt': ['own-slot'],
  });

  // The JSON edits ran backwards, each at its own recorded position — `at` for
  // the array value, `setAt` for the object key, so neither reads the other's.
  const data = JSON.parse(readFileSync(join(project, 'data.json'), 'utf8'));
  assert.deepEqual(data.list, ['a', 'b', 'c']);
  assert.deepEqual(Object.keys(data), ['list', 'beta', 'map']);
  assert.deepEqual(
    Object.keys(JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')).scripts),
    ['beta'],
  );
  assert.match(
    readFileSync(join(project, 'package.json'), 'utf8'),
    /"files": \[\n {4}"beta"\n {2}\]/,
  );

  // The co-owned block gained an owner; its body is untouched.
  const config = readFileSync(join(project, 'config.txt'), 'utf8');
  assert.match(config, /flama:begin alpha\|beta/);
  assert.match(config, /flama:end alpha\|beta/);
  assert.match(config, /^shared-line$/m);
});

test('a dry run prints the widen it would make, and changes nothing', () => {
  const project = fixture();
  const before = readFileSync(join(project, 'config.txt'), 'utf8');
  const { result } = install(project, ['--dry-run']);
  assert.equal(result.code, 0, result.out);
  // The widen is planned like every other op, not silently skipped.
  assert.match(result.out, /widen\s+config\.txt \(alpha → alpha\|beta\)/);
  assert.equal(readFileSync(join(project, 'config.txt'), 'utf8'), before);
});

test('removing the plugin returns the project to its exact bytes', () => {
  // The round trip is the whole guarantee, and this is the smallest place it
  // can be checked: the fixture is committed, so a clean `git status` after
  // add-then-remove says every edit above was reversed to the byte — the
  // joined `neededBy`, both JSON edits, the widened fence, the entry.
  const project = fixture();
  assert.equal(install(project).result.code, 0);
  const status = () =>
    execFileSync('git', ['-C', project, 'status', '--porcelain'], { encoding: 'utf8' });
  assert.notEqual(status(), '', 'the install changed nothing');

  const script = join(project, 'scripts', 'plugins', 'plugin.mjs');
  execFileSync('node', [script, 'remove', '--no-install', 'beta'], {
    encoding: 'utf8',
    env: FIXTURE_ENV,
  });

  const dirty = status();
  assert.equal(dirty, '', `not returned to its bytes:\n${dirty}`);
});

test('pruning a feature takes the slots another declares in the files that went with it', () => {
  const project = fixture();
  // A slot inside alpha's tree, which beta fills.
  writeFileSync(join(project, 'alpha', 'conf.txt'), '# flama:plugins alpha-slot\n');
  execFileSync('git', ['-C', project, 'add', '-A']);
  execFileSync('git', [
    '-C',
    project,
    '-c',
    'user.name=t',
    '-c',
    'user.email=t@t',
    'commit',
    '-qm',
    'slot',
  ]);
  const manifest = {
    ...BETA,
    blocks: [
      ...BETA.blocks,
      { file: 'alpha/conf.txt', anchor: 'alpha-slot', source: 'blocks/own.txt' },
    ],
  };
  assert.equal(install(project, [], manifest).result.code, 0);
  const catalog = join(project, 'scripts/starter/features.json');
  assert.deepEqual(
    JSON.parse(readFileSync(catalog, 'utf8')).features.beta.slots['alpha/conf.txt'],
    ['alpha-slot'],
  );

  const prune = join(project, 'scripts', 'starter', 'prune.mjs');
  execFileSync('node', [prune, '--without', 'alpha', '--no-install'], { env: FIXTURE_ENV });
  const slots = JSON.parse(readFileSync(catalog, 'utf8')).features.beta.slots;
  assert.deepEqual(Object.keys(slots), ['config.txt', 'slots.txt']);
  execFileSync('node', [prune, '--check'], { env: FIXTURE_ENV });
});

test('a feature that shapes generated files says how to rebuild them, both ways', () => {
  // The OpenAPI document and the client carry no markers, so neither the
  // install nor the removal edits them; what they do is name the step. The
  // step is the first script the project has — this one pruned the fuller one,
  // the way an API-only project has no `generate:api-client`.
  const project = fixture();
  const pkg = join(project, 'package.json');
  writeFileSync(pkg, `${JSON.stringify({ scripts: { 'generate:x': 'true' } }, null, 2)}\n`);
  const regenerate = ['generate:full', 'generate:x'];
  const manifest = { ...BETA, feature: { ...BETA.feature, regenerate } };
  const { result } = install(project, [], manifest);
  assert.equal(result.code, 0, result.out);
  assert.match(result.out, /Installed beta\. Next: pnpm install, pnpm generate:x/);

  const script = join(project, 'scripts', 'plugins', 'plugin.mjs');
  const out = execFileSync('node', [script, 'remove', '--no-install', 'beta'], {
    encoding: 'utf8',
    env: FIXTURE_ENV,
  });
  assert.match(out, /Removed beta\. Next: pnpm install, pnpm generate:x/);
});

test('a plugin cannot declare the one JSON shape that has no inverse', () => {
  // `deleteKeys` names a key without its value, so a prune can drop it and no
  // install can put it back. That is right for a shipped feature, where the
  // value lives in the file and duplicating it into the manifest would be the
  // worse bug — and a trap for a plugin, whose install would silently do
  // nothing. Better to refuse the manifest than to let it look like it works.
  const project = fixture();
  const from = mkdtempSync(join(tmpdir(), 'flama-source-'));
  source(from, {
    ...BETA,
    feature: {
      ...BETA.feature,
      json: [{ file: 'package.json', path: ['scripts'], deleteKeys: ['beta'] }],
    },
  });
  const script = join(project, 'scripts', 'plugins', 'plugin.mjs');
  let code = 0;
  let out = '';
  try {
    const args = [script, 'add', '--no-install', 'beta', '--from', from];
    out = execFileSync('node', args, { encoding: 'utf8', env: FIXTURE_ENV });
  } catch (error) {
    code = error.status;
    out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
  assert.equal(code, 2);
  assert.match(out, /deleteKeys.*cannot install/s);
});

test('into a project that pruned the other owner, the shared block comes back as its own', () => {
  // The evaluation's case. The block `beta` shares with `alpha` went when
  // `alpha` was pruned, and `gamma`'s block now ends right above the slot.
  // Widening that would hand `beta` lines it never had; the plugin carries
  // the body instead, and it goes in as the plugin's own block.
  const project = fixture({ pruned: true });
  const manifest = {
    ...BETA,
    feature: { ...BETA.feature, shared: [] },
    coOwned: [{ ...BETA.coOwned[0], source: 'blocks/shared.txt' }],
  };
  const { result } = install(project, [], manifest);
  assert.equal(result.code, 0, result.out);

  const config = readFileSync(join(project, 'config.txt'), 'utf8');
  assert.match(config, /^# flama:begin gamma\nneighbour-line\n# flama:end gamma\n/);
  assert.match(
    config,
    /# flama:begin beta\nshared-line\n# flama:end beta\n# flama:plugins the-slot/,
  );
  assert.doesNotMatch(config, /gamma\|beta|beta\|gamma/);

  // And the copied file arrived as the prune would have left it: `zeta` is
  // no feature here, so its block is emptied and the rest is untouched.
  assert.equal(
    readFileSync(join(project, 'beta', 'notes.txt'), 'utf8'),
    'kept\n# flama:begin zeta\n# flama:end zeta\n',
  );

  const script = join(project, 'scripts', 'plugins', 'plugin.mjs');
  execFileSync('node', [script, 'remove', '--no-install', 'beta'], {
    encoding: 'utf8',
    env: FIXTURE_ENV,
  });
  const dirty = execFileSync('git', ['-C', project, 'status', '--porcelain'], { encoding: 'utf8' });
  assert.equal(dirty, '', `not returned to its bytes:\n${dirty}`);
});

test('a dry run sees the shared block it puts back, and places blocks inside it', () => {
  // The carried body holds an anchor of its own; the plugin's owned block
  // goes at it. A dry run writes nothing, so the second op must read what the
  // first would have written — or it fails where the real install succeeds.
  const project = fixture({ pruned: true });
  const manifest = {
    ...BETA,
    feature: { ...BETA.feature, shared: [], json: [] },
    blocks: [{ file: 'config.txt', anchor: 'inner-slot', source: 'blocks/own.txt' }],
    coOwned: [{ ...BETA.coOwned[0], source: 'blocks/nested.txt' }],
  };
  const from = mkdtempSync(join(tmpdir(), 'flama-source-'));
  source(from, manifest, {
    'own.txt': '# flama:begin beta\nbeta-line\n# flama:end beta\n',
    'nested.txt': '# flama:begin beta\nshared-line\n# flama:plugins inner-slot\n# flama:end beta\n',
  });
  mkdirSync(join(from, 'plugins', 'beta', 'files', 'beta'), { recursive: true });
  writeFileSync(join(from, 'plugins', 'beta', 'files', 'beta', 'index.txt'), 'beta\n');
  const script = join(project, 'scripts', 'plugins', 'plugin.mjs');
  const before = readFileSync(join(project, 'config.txt'), 'utf8');
  const out = execFileSync(
    'node',
    [script, 'add', '--no-install', 'beta', '--from', from, '--dry-run'],
    {
      encoding: 'utf8',
      env: FIXTURE_ENV,
    },
  );
  assert.match(out, /block\s+config\.txt \(above flama:plugins inner-slot\)/);
  assert.equal(readFileSync(join(project, 'config.txt'), 'utf8'), before);
});

/** A project whose `app.txt` is `lines`, and a `delta` plugin carrying the starter's copy. */
function deltaSetup(lines) {
  const project = fixture();
  writeFileSync(join(project, 'app.txt'), lines.join('\n'));
  execFileSync('git', ['-C', project, 'add', '-A']);
  execFileSync('git', [
    '-C',
    project,
    '-c',
    'user.name=t',
    '-c',
    'user.email=t@t',
    'commit',
    '-qm',
    'y',
  ]);

  const from = mkdtempSync(join(tmpdir(), 'flama-source-'));
  source(from, {
    id: 'delta',
    feature: { title: 'Delta', summary: 'delta', identifiers: ['delta-app'], paths: [] },
    files: {},
    snapshots: [{ file: 'app.txt', source: 'snapshots/app.txt' }],
  });
  // The starter's copy: the feature's block, and none of the project's edit.
  mkdirSync(join(from, 'plugins', 'delta', 'snapshots'), { recursive: true });
  const starter = [
    'top',
    '# flama:begin delta',
    'delta-line',
    '# flama:end delta',
    'middle',
    'bottom',
    '',
  ];
  writeFileSync(join(from, 'plugins', 'delta', 'snapshots', 'app.txt'), starter.join('\n'));
  return { project, from, script: join(project, 'scripts', 'plugins', 'plugin.mjs') };
}

const DELTA_FILLED = [
  'top',
  '# flama:begin delta',
  'delta-line',
  '# flama:end delta',
  'middle',
  'local-edit',
  'bottom',
  '',
].join('\n');

test('a shipped feature replays its blocks into the fences its prune left', () => {
  // What a prune leaves: the feature's fences, empty, where it stood — and an
  // edit the project made since.
  const before = [
    'top',
    '# flama:begin delta',
    '# flama:end delta',
    'middle',
    'local-edit',
    'bottom',
    '',
  ];
  const { project, from, script } = deltaSetup(before);

  execFileSync('node', [script, 'add', '--no-install', 'delta', '--from', from], {
    env: FIXTURE_ENV,
  });
  assert.equal(readFileSync(join(project, 'app.txt'), 'utf8'), DELTA_FILLED);

  execFileSync('node', [script, 'remove', '--no-install', 'delta'], { env: FIXTURE_ENV });
  assert.equal(readFileSync(join(project, 'app.txt'), 'utf8'), before.join('\n'));
});

test('a project pruned before prunes kept fences still takes the blocks', () => {
  // Pruned the old way, the block went whole: no fence marks where it stood,
  // so the merge base is the starter's copy without it.
  const { project, from, script } = deltaSetup(['top', 'middle', 'local-edit', 'bottom', '']);

  execFileSync('node', [script, 'add', '--no-install', 'delta', '--from', from], {
    env: FIXTURE_ENV,
  });
  assert.equal(readFileSync(join(project, 'app.txt'), 'utf8'), DELTA_FILLED);
});

test("a file of another feature's inside the plugin's tree lands only beside that feature", () => {
  // The MCP server's organization tools: they live in the server's tree but
  // belong to organizations, so they are their own `files` entry with their
  // own `filesNeed`, and a `json` edit puts them back on that entry.
  const manifest = {
    id: 'epsilon',
    feature: {
      title: 'Epsilon',
      summary: 'epsilon',
      identifiers: ['epsilon-app'],
      paths: ['epsilon'],
      json: [
        {
          file: 'scripts/starter/features.json',
          path: ['features', 'alpha', 'paths'],
          remove: ['epsilon/alpha-tool.txt'],
          at: [1],
          needs: 'alpha',
        },
      ],
    },
    files: {
      epsilon: 'files/epsilon',
      'epsilon/alpha-tool.txt': 'files/epsilon/alpha-tool.txt',
    },
    filesNeed: { 'epsilon/alpha-tool.txt': 'alpha' },
  };
  const from = mkdtempSync(join(tmpdir(), 'flama-source-'));
  source(from, manifest);
  const tree = join(from, 'plugins', 'epsilon', 'files', 'epsilon');
  mkdirSync(tree, { recursive: true });
  writeFileSync(join(tree, 'index.txt'), 'epsilon\n');
  writeFileSync(join(tree, 'alpha-tool.txt'), 'alpha\n');
  const features = (project) =>
    JSON.parse(readFileSync(join(project, 'scripts', 'starter', 'features.json'), 'utf8')).features;

  const project = fixture();
  const before = readFileSync(join(project, 'scripts', 'starter', 'features.json'), 'utf8');
  const script = join(project, 'scripts', 'plugins', 'plugin.mjs');
  execFileSync('node', [script, 'add', '--no-install', 'epsilon', '--from', from], {
    env: FIXTURE_ENV,
  });
  assert.equal(readFileSync(join(project, 'epsilon', 'alpha-tool.txt'), 'utf8'), 'alpha\n');
  assert.deepEqual(features(project).alpha.paths, ['alpha', 'epsilon/alpha-tool.txt']);

  execFileSync('node', [script, 'remove', '--no-install', 'epsilon'], { env: FIXTURE_ENV });
  assert.equal(readFileSync(join(project, 'scripts', 'starter', 'features.json'), 'utf8'), before);
  assert.equal(existsSync(join(project, 'epsilon')), false);

  // Without its owner the file would be a fragment of a feature the project
  // pruned, which no check would notice.
  const pruned = fixture({ pruned: true });
  const prunedScript = join(pruned, 'scripts', 'plugins', 'plugin.mjs');
  execFileSync('node', [prunedScript, 'add', '--no-install', 'epsilon', '--from', from], {
    env: FIXTURE_ENV,
  });
  assert.equal(existsSync(join(pruned, 'epsilon', 'alpha-tool.txt')), false);
  assert.equal(existsSync(join(pruned, 'epsilon', 'index.txt')), true);
});

/** Commit whatever the fixture holds now, as the state a test starts from. */
function commit(project, message) {
  execFileSync('git', ['-C', project, 'add', '-A']);
  const who = ['-c', 'user.name=t', '-c', 'user.email=t@t'];
  execFileSync('git', ['-C', project, ...who, 'commit', '-qm', message]);
}

/** The starter's version of a file, and a feature's: the same lines, and its own fenced among them. */
const STARTER_CONF = ['import kit;', '', 'export const providers = {};', ''].join('\n');
const FEATURE_CONF = [
  'import kit;',
  '# flama:begin omega',
  'import omega;',
  '# flama:end omega',
  '',
  'export const providers = {};',
  '# flama:begin omega',
  'providers.omega = omega;',
  '# flama:end omega',
  '',
].join('\n');

test('a prune gives a replaced file back to the starter, with no fence left in it', () => {
  const project = fixture();
  writeFileSync(join(project, 'conf.txt'), FEATURE_CONF);
  const catalog = join(project, 'scripts', 'starter', 'features.json');
  const manifest = JSON.parse(readFileSync(catalog, 'utf8'));
  manifest.features.omega = {
    title: 'Omega',
    summary: 'omega',
    identifiers: ['omega'],
    paths: [],
    replaces: ['conf.txt'],
  };
  writeFileSync(catalog, `${JSON.stringify(manifest, null, 2)}\n`);
  commit(project, 'omega');
  const prune = join(project, 'scripts', 'starter', 'prune.mjs');
  execFileSync('node', [prune, '--check'], { env: FIXTURE_ENV });

  execFileSync('node', [prune, '--without', 'omega', '--no-install'], { env: FIXTURE_ENV });
  assert.equal(readFileSync(join(project, 'conf.txt'), 'utf8'), STARTER_CONF);
  execFileSync('node', [prune, '--check'], { env: FIXTURE_ENV });
});

test('--check refuses a replaced file that holds no block of the feature', () => {
  const project = fixture();
  writeFileSync(join(project, 'conf.txt'), STARTER_CONF);
  const catalog = join(project, 'scripts', 'starter', 'features.json');
  const manifest = JSON.parse(readFileSync(catalog, 'utf8'));
  manifest.features.alpha.replaces = ['conf.txt'];
  writeFileSync(catalog, `${JSON.stringify(manifest, null, 2)}\n`);
  const prune = join(project, 'scripts', 'starter', 'prune.mjs');
  let out = '';
  try {
    execFileSync('node', [prune, '--check'], {
      encoding: 'utf8',
      env: FIXTURE_ENV,
      stdio: 'pipe',
    });
  } catch (error) {
    out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
  assert.match(out, /"alpha" replaces conf\.txt, which holds no block of it/);
});

test("a plugin replaces the starter's version of a file, and its removal gives it back", () => {
  const project = fixture();
  writeFileSync(join(project, 'conf.txt'), STARTER_CONF);
  commit(project, 'conf');

  const from = mkdtempSync(join(tmpdir(), 'flama-source-'));
  source(from, {
    id: 'omega',
    feature: {
      title: 'Omega',
      summary: 'omega',
      identifiers: ['omega'],
      paths: [],
      replaces: ['conf.txt'],
    },
    files: {},
    snapshots: [{ file: 'conf.txt', source: 'snapshots/conf.txt' }],
  });
  mkdirSync(join(from, 'plugins', 'omega', 'snapshots'), { recursive: true });
  writeFileSync(join(from, 'plugins', 'omega', 'snapshots', 'conf.txt'), FEATURE_CONF);
  const script = join(project, 'scripts', 'plugins', 'plugin.mjs');

  // The install ends with `--check`, which now covers the file.
  execFileSync('node', [script, 'add', '--no-install', 'omega', '--from', from], {
    env: FIXTURE_ENV,
  });
  assert.equal(readFileSync(join(project, 'conf.txt'), 'utf8'), FEATURE_CONF);
  const catalog = join(project, 'scripts', 'starter', 'features.json');
  const entry = JSON.parse(readFileSync(catalog, 'utf8')).features.omega;
  assert.deepEqual(entry.replaces, ['conf.txt']);
  // Nothing went in at a slot: the file is the feature's place.
  assert.deepEqual(entry.slots, {});

  execFileSync('node', [script, 'remove', '--no-install', 'omega'], { env: FIXTURE_ENV });
  const dirty = execFileSync('git', ['-C', project, 'status', '--porcelain'], { encoding: 'utf8' });
  assert.equal(dirty, '', `not returned to its bytes:\n${dirty}`);
});
