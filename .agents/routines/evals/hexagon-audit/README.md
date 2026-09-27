# Evals for the hexagon-audit routine

The routine (`.agents/routines/hexagon-audit.md`) is a prompt, and a prompt
decays like code: a reworded rule, a new module or a model change can make it
miss violations or start crying wolf. This directory is how you find out before
the daily issue does.

## What it measures

| Run | Setup | Question |
| --- | --- | --- |
| `planted` | `origin/main` plus `plant.mjs`, committed as one commit | Does it catch known violations of each checklist key (**recall**) while leaving the decoys alone? |
| `clean` | `origin/main`, untouched, deep dive on `users/` | Does it stay quiet on the module `ARCHITECTURE.md` tells you to copy (**precision**)? |

`cases.json` holds the expected verdict for every planted item (`P*`) and every
decoy (`N*`), plus the pass bar.

`plant.mjs` plants 11 violations across 8 checklist keys in `users/` and
`admin/` (modules every project keeps), a mechanical boundary breach (P8), and
a ledger addition that silences a boundary rule (P11). It also plants two
decoys that look like violations but are allowed. Most of the violations pass
both scripts. That is the point: the judgment layer is what this eval tests.
On the starter, `node scripts/check-api-structure.mjs` still passes after the
plant, `pnpm turbo run arch --filter=@flama/api` reports exactly P8, and the
route-policy spec passes. The planted tree does not typecheck (P1, P4 and P9a
break `tsc`), which is fine: the routine's review never builds it.

## How to run it

```bash
SP=$(mktemp -d)
git worktree add --detach "$SP/planted" origin/main
node .agents/routines/evals/hexagon-audit/plant.mjs "$SP/planted"
(cd "$SP/planted" && pnpm install --frozen-lockfile && git commit -qam "feat(users): planted fixture")
```

Then start one Claude Code session per run, each with no access to this
directory. The prompt is the routine file followed by the run's arguments from
`cases.json`, for example:

> Read `.agents/routines/hexagon-audit.md` and follow it exactly with
> `--since HEAD~1 --module profile --dry-run $SP/out/planted.md`.
> The repository root is `$SP/planted`.

Grade the two reports against `cases.json` by hand, or hand both reports and the
file to a fresh session as the grader. Clean up with `git worktree remove`.

Each edit in `plant.mjs` anchors on an exact string. When the code under an
anchor moves, the script fails and names the case; update the anchor. Run
`node .agents/routines/evals/hexagon-audit/plant.mjs <copy>` against a copy of
the tree (`git archive HEAD apps/api | tar -x -C <copy>`) to check the anchors
without a worktree.

Run the eval whenever the routine prompt, `ARCHITECTURE.md` or
`.agents/rules/nestjs-*.md` changes, and when the routine's model changes.

## Results

See `RESULTS.md` for what earlier runs changed in the prompt.
