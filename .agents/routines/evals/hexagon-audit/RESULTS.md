# Eval results

## Not yet run on this repository

The prompt and the fixture came from a project built on this starter, where
two versions were run once each against the same planted fixture (a smoke
test, not a benchmark: LLM output varies, so re-run anything borderline).
Both caught all 13 planted items with no decoy under Findings; v2 is the one
that ships here. Record the first run on this repository below, in the same
shape.

| | planted | clean |
| --- | --- | --- |
| Planted items caught (of 13) | | – |
| Decoys under Findings (N1–N5) | | |
| Rows under Findings | | |
| Mechanical breach (P8) reported as blocking | | – |
| Ledger addition (P11) caught | | – |
| Ledger counts match the `grep` commands | | |

## What v1 got wrong, and what changed in v2

1. **Severity inflation.** Every finding was "blocking", including a
   pagination envelope that every list endpoint (the reference `users/` among
   them) builds in the controller. v2 defines blocking as "changes behaviour
   or the contract", and adds **systemic**: a pattern in three or more modules
   is reported once, as drift, flagged as the rule and the code disagreeing.
2. **One pattern, many rows.** Four controllers calling the same port became
   four blocking rows. v2 reports one row per pattern and lists the
   occurrences in the evidence.
3. **Noise about allowed code.** The decoy `throw new Error` in the queue
   processor turned up under "Worth a look" as "not a finding". v2 says:
   something verified as allowed goes nowhere.
4. **Rule vs reference.** Several reviewers hit "the rule forbids X, but
   `users/` does X". v2 makes that one "Worth a look" line naming both sides, so
   the daily issue stops relitigating it.
5. **Fix PRs on design questions.** Several handlers in one module shared one
   result type that carried more than the id. v2 bars systemic and
   multi-occurrence findings from the fix PR.
6. **Ledger counting** drifted between runs because the agents counted by eye.
   The prompt now gives the exact `grep` commands.

## Things the eval does not cover yet

- Step 7 (the fix PR) and GitHub publishing. They are tested by the first
  scheduled runs; check the first few PRs by hand.
- The `--since 26 hours ago` date path. Every eval uses a git ref.
- Variance. Run each case three times before trusting a small change in the
  numbers.
