# Routines

Prompts that a scheduled Claude Code routine runs, versioned here so a change
goes through review like code does. Nothing in the repository schedules them:
a project that wants one creates a routine (claude.ai → Routines, or any
scheduler that runs `claude -p` in a fresh checkout) whose own prompt only
points at the file here, so editing the file is how you change what the
routine does. Each needs the repository's GitHub remote and the GitHub tools
(or `gh`) to publish; without them, run it with `--dry-run` or the skill's
report-only mode.

| Routine | Suggested schedule | What it does |
| --- | --- | --- |
| [`hexagon-audit.md`](hexagon-audit.md) | daily | Audits `apps/api` against its Domain-Driven Hexagon contract. Keeps one `hexagon-audit` issue current and opens a small fix PR for the blocking findings it is sure about. |
| `/frontend-audit routine` (the skill in `.agents/skills/frontend-audit/`) | daily | Audits the frontend apps and packages against the frontend rules. Keeps one `frontend-audit` issue current and opens one fix PR for the findings that are safe to fix. Its prompt is the skill, and its evals are `scripts/evals/frontend-audit/`. |

A routine prompt such as "Read `.agents/routines/hexagon-audit.md` and follow
it exactly." is enough; the file carries the arguments and the defaults.

Each routine has evals under `evals/<routine>/`. Run them when you change the
prompt, or the rules it enforces.
