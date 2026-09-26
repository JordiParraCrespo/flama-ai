#!/usr/bin/env node
/**
 * Turn the starter into your project, in one command.
 *
 *   pnpm starter:init                                      # asks, then shows the plan
 *   pnpm starter:init --keep web,e2e,organizations --yes   # the same defaults, unattended
 *   pnpm starter:init --keep web --add '' --yes            # nothing added
 *
 * Two questions decide a project: which of the features the starter ships to
 * keep, and which plugins to add. This asks both (or reads `--keep` and
 * `--add`), shows the plan, and carries it out: the prune, then each plugin
 * after the ones it requires, the manifest check once, `pnpm install` once,
 * and a list of the prose that still names what went. There is nothing to
 * retire afterwards; run it again later and it offers only what is left.
 *
 * All or nothing. The work happens in a throwaway git worktree of HEAD and
 * reaches your checkout as one patch, only once every step has passed there —
 * so a plugin that fails to install leaves the project exactly as it was, not
 * pruned with half its plugins in. That is also why it wants a clean tree: the
 * worktree is HEAD, and a patch from HEAD applies cleanly only to HEAD.
 *
 * With no `--add`, it adds what the questions default to (`DEFAULT_ADD`);
 * `--add ''` adds nothing. With no `--keep`, it keeps `DEFAULT_KEEP`. One
 * default, whichever way it is run.
 *
 * Flags: --keep <ids>, --add <ids>, --yes (do not ask for confirmation),
 * --dry-run (plan only), --no-install (skip `pnpm install`), and --from /
 * --repo / --ref, for where the plugins come from.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_REF,
  DEFAULT_REPO,
  installProblems,
  loadPlugin,
  pluginIds,
  resolveSource,
} from '../plugins/source.mjs';
import { expandKeep, mentions, printMentions, regenerateSteps, resolveRemoval } from './prune.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

/**
 * What a project gets when it answers nothing: the browser app, its
 * end-to-end suite, organizations, and the docs site. Most projects start
 * here; the rest — a phone app, the control plane, a Go service — is a
 * question each.
 */
export const DEFAULT_KEEP = ['web', 'e2e', 'organizations'];
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

/** What a run keeps and adds before any question: the flags, or the defaults. */
export function choice(options) {
  return { keep: options.keep ?? DEFAULT_KEEP, add: options.add ?? DEFAULT_ADD };
}

/**
 * The plan for a choice, or why it cannot work. Pure: it reads nothing and
 * prints nothing, so a dry run, a test and the real run agree.
 *
 * `plugins` maps each available plugin id to its manifest. A plugin that
 * requires another plugin brings it along. Whether a plugin fits is the
 * installer's own rule (`installProblems`), asked of the project this choice
 * would leave; `exists` answers for paths the manifest does not track, and
 * defaults to "there", which is what a fresh starter is.
 */
export function plan(manifest, plugins, keep, add, exists = () => true) {
  const shipped = Object.keys(manifest.features).filter((id) => !manifest.features[id].plugin);
  const problems = [];
  for (const id of keep) {
    if (!shipped.includes(id)) problems.push(`"${id}" is not a feature this starter ships`);
  }
  for (const id of add) {
    if (!plugins[id]) problems.push(`there is no plugin "${id}"`);
    else if (manifest.features[id]) problems.push(`"${id}" is already installed`);
  }
  if (problems.length) return { problems };

  const expanded = expandKeep(manifest, keep);
  const kept = expanded.kept.filter((id) => shipped.includes(id));
  const dropped = shipped.filter((id) => !kept.includes(id));
  const removal = dropped.length
    ? resolveRemoval(manifest, dropped)
    : { features: [], shared: [], notes: [] };
  // Everything the prune will take, installed plugins included: one that
  // requires a dropped app goes with it, and the plan has to say so rather
  // than let the confirmation read as if only the shipped apps were leaving.
  const remove = removal.features;
  const gone = [...remove.flatMap((id) => manifest.features[id].paths), ...removal.shared];
  const hasPath = (path) =>
    !gone.some((root) => path === root || path.startsWith(`${root}/`)) && exists(path);

  // Plugins in the order they can go in: each after the plugins it requires.
  const order = [];
  const hasFeature = (id) =>
    kept.includes(id) ||
    (Boolean(manifest.features[id]?.plugin) && !remove.includes(id)) ||
    order.includes(id);
  const visit = (id, chain) => {
    if (order.includes(id)) return;
    if (chain.includes(id)) {
      problems.push(`plugins require each other in a loop: ${[...chain, id].join(' → ')}`);
      return;
    }
    for (const dep of plugins[id].feature.requires ?? []) {
      if (plugins[dep] && !hasFeature(dep)) visit(dep, [...chain, id]);
    }
    problems.push(...installProblems({ id, ...plugins[id] }, { hasFeature, hasPath }));
    order.push(id);
  };
  for (const id of add) visit(id, []);
  if (problems.length) return { problems };
  const pulled = order.filter((id) => !add.includes(id));
  return {
    keep: kept,
    remove,
    add: order,
    pulled,
    notes: [
      ...expanded.notes,
      ...removal.notes,
      ...pulled.map((id) => `adding ${id} too: a chosen plugin requires it`),
    ],
  };
}

async function ask(rl, manifest, plugins) {
  const yesNo = async (question, fallback) => {
    const answer = (await rl.question(`${question} ${fallback ? '[Y/n]' : '[y/N]'} `))
      .trim()
      .toLowerCase();
    return answer ? answer.startsWith('y') : fallback;
  };
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
    const summary = `  ${id.padEnd(16)} ${plugins[id].feature.summary}${note}\n  add?`;
    if (await yesNo(summary, DEFAULT_ADD.includes(id))) add.push(id);
  }
  return { keep, add };
}

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', ...options });
}

/**
 * Carry out `result` in a throwaway worktree of HEAD and hand back the patch
 * it produced, or fail having changed nothing. The worktree runs its own copy
 * of the scripts, which is the one at HEAD — the same as this checkout's.
 */
function stage(result, source) {
  const dir = mkdtempSync(join(tmpdir(), 'flama-init-'));
  rmSync(dir, { recursive: true, force: true });
  git(['worktree', 'add', '--quiet', '--detach', dir, 'HEAD']);
  const cleanup = () => {
    try {
      git(['worktree', 'remove', '--force', dir], { stdio: 'pipe' });
    } catch {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  process.on('exit', cleanup);
  const step = (script, args) => {
    try {
      execFileSync('node', [join(dir, script), ...args], { cwd: dir, stdio: 'inherit' });
    } catch {
      fail(`${script} ${args.join(' ')} failed. Your project was not touched.`);
    }
  };
  if (result.remove.length) {
    const without = result.remove.join(',');
    step('scripts/starter/prune.mjs', ['--without', without, '--no-install', '--no-report']);
  }
  for (const id of result.add) {
    step('scripts/plugins/plugin.mjs', ['add', id, '--from', source.dir, '--no-check']);
  }
  // Once, over the finished tree: each install would otherwise pay for it.
  step('scripts/starter/prune.mjs', ['--check']);

  git(['add', '-A'], { cwd: dir });
  const patch = execFileSync('git', ['diff', '--cached', '--binary', 'HEAD'], {
    cwd: dir,
    maxBuffer: 256 * 1024 * 1024,
  });
  cleanup();
  process.off('exit', cleanup);
  return patch;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  try {
    git(['rev-parse', '--verify', '--quiet', 'HEAD'], { stdio: 'pipe' });
  } catch {
    fail('this needs a git checkout with a commit: the work is staged in a worktree of HEAD');
  }
  if (!options.dryRun && git(['status', '--porcelain']).trim()) {
    fail('the working tree has changes. Commit or stash them first: the plan runs against HEAD.');
  }
  const manifest = JSON.parse(readFileSync(join(HERE, 'features.json'), 'utf8'));

  const interactive = options.keep === null && options.add === null;
  if (interactive && !process.stdin.isTTY) {
    fail('no terminal to ask in: pass --keep <ids> and --add <ids> (or --add "" for none)');
  }
  const rl = process.stdin.isTTY
    ? createInterface({ input: process.stdin, output: process.stdout })
    : null;
  try {
    let { keep, add } = choice(options);
    // Fetched once, and only when a plugin is in play; every install reads it.
    const source = interactive || add.length ? resolveSource(options.source) : null;
    const plugins = Object.fromEntries(
      (source ? pluginIds(source) : []).map((id) => [id, loadPlugin(source, id)]),
    );
    if (interactive) ({ keep, add } = await ask(rl, manifest, plugins));

    const result = plan(manifest, plugins, keep, add, (path) => existsSync(join(ROOT, path)));
    if (result.problems) fail(`that combination cannot work:\n  ${result.problems.join('\n  ')}`);
    console.log('\nThe plan:\n');
    console.log(`  keep    api${result.keep.length ? `, ${result.keep.join(', ')}` : ''}`);
    console.log(`  remove  ${result.remove.join(', ') || '(nothing)'}`);
    console.log(`  add     ${result.add.join(', ') || '(nothing)'}`);
    for (const note of result.notes) console.log(`          ${note}`);
    if (options.dryRun) {
      console.log('\nDry run: nothing was changed.');
      return;
    }
    if (!options.yes) {
      const answer = rl ? (await rl.question('\nGo ahead? [y/N] ')).trim().toLowerCase() : '';
      if (!answer.startsWith('y')) {
        console.log(rl ? 'Nothing was changed.' : 'Pass --yes to go ahead.');
        return;
      }
    }
    rl?.close();

    if (result.remove.length || result.add.length) {
      const patch = stage(result, source);
      if (patch.length) git(['apply', '--binary'], { input: patch });
    }
    if (options.install) {
      console.log('\npnpm install (the lockfile follows the tree)...');
      try {
        execFileSync('pnpm', ['install'], { cwd: ROOT, stdio: 'inherit' });
      } catch {
        fail('pnpm install failed. The tree is initialised; run it again once the cause is fixed.');
      }
    }

    // Last, over the finished project: the prose that still names what went,
    // including any a plugin brought in.
    const removal = result.remove.length
      ? resolveRemoval(manifest, result.remove)
      : { features: [], shared: [] };
    printMentions(
      mentions([
        ...removal.features.flatMap((id) => manifest.features[id].identifiers),
        ...removal.shared.flatMap((path) => manifest.shared[path].identifiers),
      ]),
    );
    const followUps = regenerateSteps([
      ...removal.features.map((id) => manifest.features[id]),
      ...result.add.map((id) => plugins[id].feature),
    ]);
    const kept = result.keep.length ? `, ${result.keep.join(', ')}` : '';
    const added = result.add.length ? `, and ${result.add.join(', ')}` : '';
    console.log(`
Your project: api${kept}${added}.

Next:
  cp .env.example .env            then set the secrets it asks for
  pnpm docker:dev && pnpm dev     Postgres, Redis and every app${followUps.map((step) => `\n  ${step}`).join('')}
  git add -A && git commit -m "chore: initialize project from the starter"`);
  } finally {
    rl?.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
