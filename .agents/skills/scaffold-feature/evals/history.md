# Eval history

Each round runs scenarios from `evals.json` in fresh worktrees and has a
separate agent grade the diffs blind (labels shuffled), expectation by
expectation, plus the extras a senior reviewer would flag. The baseline is the
skill as it was before the rewrite (a generator's manual, 77 lines), run
against the same repository state.

## Round 1: rewrite vs baseline

| Scenario | Baseline | Rewrite | Grader's pick |
| --- | --- | --- | --- |
| 1 members pane | 12/12 | 12/12 | rewrite (per-action permissions, read errors, role colour in es) |
| 2 workspaces module | 13/13 | 13/13 | **baseline** (last-workspace rule, permissions, read errors) |
| 3 mobile devices | 8/10 | 10/10 | rewrite (baseline's AlertDialog never mounts) |
| 4 token rename, no endpoint | tie | tie | both found the gap and built the endpoint first |
| 5 review a planted feature | 10/11 | 10/11 | rewrite (baseline reintroduced browser-side search) |

The expectations saturated; the graders separated the attempts on what they
did not name. Those became round 2's changes and expectations: read the
controller's policies and business rules and mirror them, render every read's
failed state, translate data labels without losing their colour, build only
what was asked, lead a review with its findings, and confirm on mobile with a
sheet the app can mount.

## Round 2: hardened expectations, three-way

| Scenario | Baseline | Round 1 | Round 2 | Grader's ranking |
| --- | --- | --- | --- | --- |
| 1 members pane (15) | 12 | 15 | 14 | round 2 > round 1 > baseline |
| 2 workspaces module (16) | 15 | 13 | 16 | round 2 > baseline > round 1 |
| 3 mobile devices (12) | 9 | 12 | 12 | round 2 > round 1 > baseline |
| **Total (43)** | **36** | **40** | **42** | round 2 first in every scenario |

Left for the next round: a failed read still drew the empty table under its
`Alert` (now explicit in step 3), and one summary did not say the e2e spec was
not run (now explicit in step 8).

The runs also found repository bugs, fixed in the same change:
`scaffold-feature.mjs` wrote an `@/` import into mobile screens, the mobile
kit did not re-export `useLocale` and the formatters, `verify-feature.mjs`
linted the whole branch instead of the change, and two web e2e specs still
drove screens that no longer exist.
