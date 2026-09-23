#!/usr/bin/env node
/**
 * Turn the starter into your project, in one command.
 *
 *   pnpm starter:init                                 # asks, then shows the plan
 *   pnpm starter:init --keep web,e2e --add docs --yes # the same, unattended
 *
 * Two questions decide a project: which of the apps the starter ships to
 * keep, and which plugins to add. This asks both, shows the plan, and then
 * does what used to take a skill and an afternoon: prunes what goes
 * (`prune.mjs`), installs what comes (`plugin.mjs`), in dependency order,
 * refreshes the lockfile once, and checks the manifest still describes the
 * repo. There is nothing to retire afterwards and no flag to remember; run it
 * again later and it only offers what is left.
 *
 * It refuses a dirty tree, so going back is always `git reset --hard` plus
 * `git clean -fd` — a prune is a large deletion, and undoing it should never
 * mean untangling it from your own work.
 *
 * Flags: --keep <ids> and --add <ids> (skip the questions), --yes (do not ask
 * for confirmation), --dry-run (plan only), --no-install (skip `pnpm
 * install`), and --from / --repo / --ref, passed to the plugin fetch.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_REF,
  DEFAULT_REPO,
  loadPlugin,
  pluginIds,
  resolveSource,
} from '../plugins/plugin.mjs';
import { expandKeep, mentions, printMentions, resolveRemoval } from './prune.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const PRUNE = join(HERE, 'prune.mjs');
const PLUGIN = join(ROOT, 'scripts', 'plugins', 'plugin.mjs');

/**
 * What a project gets when it answers nothing: the browser app and its
 * end-to-end suite, plus the docs site. Most projects start here, and the
 * rest — a phone app, the control plane, a Go service — is a question each.
 */
export const DEFAULT_KEEP = ['web', 'e2e'];
export const DEFAULT_ADD = ['docs'];

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(2);
}

function list(value) {
  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function parseArgs(argv) {
  const options = {
    keep: null,
    add: null,
    yes: false,
    dryRun: false,
    install: true,
    source: { from: null, repo: DEFAULT_REPO, ref: DEFAULT_REF },
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) fail(`${arg} needs a value`);
      i += 1;
      return next;
    };
    if (arg === '--keep') options.keep = list(value());
    else if (arg === '--add') options.add = list(value());
    else if (arg === '--yes' || arg === '-y') options.yes = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--no-install') options.install = false;
    else if (arg === '--from') options.source.from = value();
    else if (arg === '--repo') options.source.repo = value();
    else if (arg === '--ref') options.source.ref = value();
    else fail(`unknown argument ${arg}`);
  }
  return options;
}

/**
 * The plan for a choice, or the reason it cannot work. Pure, so the rules a
 * project has to satisfy are tested without touching a repo.
 *
 * `plugins` maps each available plugin id to its manifest. A plugin that
 * requires another plugin brings it along; one that requires a shipped
 * feature the choice drops, or builds on a shared package the prune would
 * take, is refused with the reason rather than failing halfway through.
 */
export function plan(manifest, plugins, keep, add) {
  const shipped = Object.keys(manifest.features).filter((id) => !manifest.features[id].plugin);
  const problems = [];
  for (const id of keep) {
    if (!shipped.includes(id)) problems.push(`"${id}" is not an app this starter ships`);
  }
  for (const id of add) {
    if (!plugins[id]) problems.push(`there is no plugin "${id}"`);
    else if (manifest.features[id]) problems.push(`"${id}" is already installed`);
  }
  if (problems.length) return { problems };

  const kept = expandKeep(manifest, keep).filter((id) => shipped.includes(id));
  const remove = shipped.filter((id) => !kept.includes(id));
  const { shared: pruned } = remove.length ? resolveRemoval(manifest, remove) : { shared: [] };

  // Plugins in the order they can go in: each after the plugins it requires.
  const order = [];
  const visit = (id, chain) => {
    if (order.includes(id)) return;
    if (chain.includes(id)) {
      problems.push(`plugins require each other in a loop: ${[...chain, id].join(' → ')}`);
      return;
    }
    for (const dep of plugins[id].feature.requires ?? []) {
      if (plugins[dep] && !manifest.features[dep]) visit(dep, [...chain, id]);
      else if (!manifest.features[dep] || remove.includes(dep)) {
        problems.push(`"${id}" needs "${dep}", which this project would not have`);
      }
    }
    // A control plane builds on its platform's kits; with every app of that
    // platform pruned, there is no kit to build on.
    const carried = new Set(Object.keys(plugins[id].sharedFiles ?? {}));
    for (const { path } of plugins[id].feature.shared ?? []) {
      if (pruned.includes(path) && !carried.has(path)) {
        problems.push(`"${id}" builds on ${path}, which goes when its last app does`);
      }
    }
    order.push(id);
  };
  for (const id of add) visit(id, []);
  return problems.length
    ? { problems }
    : { keep: kept, remove, add: order, pulled: order.filter((id) => !add.includes(id)) };
}

async function ask(manifest, plugins) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const yesNo = async (question, fallback) => {
    const answer = (await rl.question(`${question} ${fallback ? '[Y/n]' : '[y/N]'} `))
      .trim()
      .toLowerCase();
    return answer ? answer.startsWith('y') : fallback;
  };
  try {
    console.log('\nWhat does this project keep? The API always stays.\n');
    const keep = [];
    for (const [id, feature] of Object.entries(manifest.features)) {
      if (feature.plugin) continue;
      if (await yesNo(`  ${id.padEnd(16)} ${feature.summary}\n  keep?`, DEFAULT_KEEP.includes(id)))
        keep.push(id);
    }
    const available = Object.keys(plugins).filter((id) => !manifest.features[id]);
    const add = [];
    if (available.length) console.log('\nWhat does it add?\n');
    for (const id of available) {
      const requires = plugins[id].feature.requires ?? [];
      const note = requires.length ? ` (needs ${requires.join(', ')})` : '';
      if (
        await yesNo(
          `  ${id.padEnd(16)} ${plugins[id].feature.summary}${note}\n  add?`,
          DEFAULT_ADD.includes(id),
        )
      )
        add.push(id);
    }
    return { keep, add, rl };
  } catch (error) {
    rl.close();
    throw error;
  }
}

/**
 * One step of the plan. Its own output has already said what went wrong; what
 * is left to say is how to get back, which the clean-tree rule guarantees.
 */
function run(command, args) {
  try {
    execFileSync(command, args, { cwd: ROOT, stdio: 'inherit' });
  } catch {
    fail(
      `${[command, ...args].join(' ')} failed, and the project is half-changed.\n` +
        'Go back to where it started with: git reset --hard && git clean -fd',
    );
  }
}

function clean() {
  try {
    return !execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return true; // not a git checkout: nothing to protect, nothing to check
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.dryRun && !clean()) {
    fail('the working tree has changes. Commit or stash them first, so this is easy to undo.');
  }
  const manifest = JSON.parse(readFileSync(join(HERE, 'features.json'), 'utf8'));

  const interactive = options.keep === null && options.add === null;
  if (interactive && !process.stdin.isTTY) {
    fail('no terminal to ask in: pass --keep <ids> and --add <ids>');
  }
  // Fetched once, and only when there is a plugin to look at; every install
  // below reads the same checkout.
  const wantsPlugins = interactive || (options.add ?? []).length > 0;
  const source = wantsPlugins ? resolveSource(options.source) : null;
  const plugins = Object.fromEntries(
    (source ? pluginIds(source) : []).map((id) => [id, loadPlugin(source, id)]),
  );

  let keep = options.keep ?? DEFAULT_KEEP;
  let add = options.add ?? [];
  let rl = null;
  if (interactive) ({ keep, add, rl } = await ask(manifest, plugins));

  const result = plan(manifest, plugins, keep, add);
  if (result.problems) {
    rl?.close();
    fail(`that combination cannot work:\n  ${result.problems.join('\n  ')}`);
  }

  console.log('\nThe plan:\n');
  console.log(`  keep    api, ${result.keep.join(', ') || '(nothing else)'}`);
  console.log(`  remove  ${result.remove.join(', ') || '(nothing)'}`);
  console.log(`  add     ${result.add.join(', ') || '(nothing)'}`);
  if (result.pulled.length)
    console.log(`          (${result.pulled.join(', ')}: required by another)`);
  if (options.dryRun) {
    rl?.close();
    console.log('\nDry run: nothing was changed.');
    return;
  }
  if (!options.yes) {
    const rlConfirm = rl ?? createInterface({ input: process.stdin, output: process.stdout });
    const answer = process.stdin.isTTY
      ? (await rlConfirm.question('\nGo ahead? [y/N] ')).trim().toLowerCase()
      : '';
    rlConfirm.close();
    if (!answer.startsWith('y')) {
      console.log(process.stdin.isTTY ? 'Nothing was changed.' : 'Pass --yes to go ahead.');
      return;
    }
  } else {
    rl?.close();
  }

  if (result.remove.length) {
    run('node', [PRUNE, '--without', result.remove.join(','), '--no-install', '--no-report']);
  }
  for (const id of result.add) run('node', [PLUGIN, 'add', id, '--from', source.dir]);
  if (options.install) {
    console.log('\npnpm install (the lockfile follows the tree)...');
    run('pnpm', ['install']);
  }
  run('node', [PRUNE, '--check']);

  // Last, over the finished project: the prose that still names what went,
  // including any a plugin brought in.
  const { features: gone, shared: goneShared } = result.remove.length
    ? resolveRemoval(manifest, result.remove)
    : { features: [], shared: [] };
  printMentions(
    mentions([
      ...gone.flatMap((id) => manifest.features[id].identifiers),
      ...goneShared.flatMap((path) => manifest.shared[path].identifiers),
    ]),
  );

  const followUps = result.add.flatMap((id) => plugins[id].postInstall ?? []);
  console.log(`
Your project: api${result.keep.length ? `, ${result.keep.join(', ')}` : ''}${
    result.add.length ? `, and ${result.add.join(', ')}` : ''
  }.

Next:
  cp .env.example .env            then set the secrets it asks for
  pnpm docker:dev && pnpm dev     Postgres, Redis and every app${
    followUps.length ? `\n  ${[...new Set(followUps)].join('\n  ')}` : ''
  }
  git add -A && git commit -m "chore: initialize project from the starter"`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
