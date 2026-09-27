---
name: frontend-audit
description: Audit the frontend apps (apps/web, apps/mobile) and the frontend packages (packages/frontend/*) against the frontend architecture, UI, forms and render rules, including re-renders the React Compiler does not prevent. Use when asked to audit, review or health-check the frontend, check that the frontend architecture is being followed, look for unnecessary re-renders or render cost, or when a scheduled frontend-audit routine fires. Runs the mechanical checks, then reviews what they cannot see, reports findings against a stable rule catalog, and with `--fix` fixes the ones that are safe to fix in a pull request.
---

# Frontend audit

The frontend rules are `.agents/rules/frontend-architecture.md`,
`.agents/rules/frontend-ui.md` and `.agents/rules/forms.md`, plus the design
system's `packages/frontend/design-system/AGENTS.md` and each app's
`AGENTS.md`. Most of them are already checked by a script. This audit runs
those scripts, then reviews what no script can see: which clock updates a
component, where its state lives, and what re-renders when that clock ticks.
Every finding cites a rule ID from the catalog below, so a finding can be
tracked from one run to the next and the evals in
`scripts/evals/frontend-audit/` can grade it.

The apps are whichever of these the project kept: `apps/web` (Vite +
TanStack Router, `@flama/frontend-web`, `@flama/design-system-web`) and
`apps/mobile` (Expo + expo-router, `@flama/frontend-mobile`,
`@flama/design-system-mobile`). Both load `@flama/frontend-core` and
`@flama/frontend-consumer`. An app a prune removed is simply out of scope;
so is a check whose script went with it. Apps added by a plugin
(`apps/admin-web`, `apps/admin-mobile`, `packages/frontend/admin`) are in
scope when present, audited like their consumer twin.

## Arguments

- `full`: every app's source (`apps/web/src`; `apps/mobile/{app,features,lib}`)
  and `packages/frontend/*/src`.
- `diff --base <ref>`: only the frontend files changed since `<ref>`
  (`git diff --name-only <ref>...HEAD -- apps/web apps/mobile packages/frontend`),
  plus the files that render them or that they render when a finding depends
  on that.
- `routine`: what a scheduled routine runs. See **Routine mode** below.
- `--fix`: after the report, fix what Step 3 allows and open a pull request.
  Without it the audit only reports. `routine` implies it.
- `--format json`: end with the JSON block only, no prose report. The evals use this.

With no argument, use `diff --base origin/main` when the branch has changes,
and `full` otherwise.

## Step 1: the mechanical checks

Run each command and record any failure as an `M-*` finding. Do not
re-diagnose a check's failure by hand: quote its output.

| ID | Command |
| --- | --- |
| `M-structure` | `pnpm check:structure` |
| `M-arch` | `pnpm arch` (Turborepo builds the workspace packages first; plain `depcruise` on a fresh checkout cannot resolve `@flama/*` and its errors are false) |
| `M-biome` | `pnpm exec biome lint --error-on-warnings apps/web apps/mobile packages/frontend` (name only the directories that exist) |
| `M-design` | `pnpm lint:design` (rules at `warn` are counts to watch, not failures; report a count that went up) |
| `M-compiler` | `pnpm check:compiler` (lists, per app, what the React Compiler leaves uncompiled; report a file that is new to the list, and judge each one under `R10`) |
| `M-render` | `pnpm turbo run test --filter=@flama/web --filter=@flama/frontend-web --filter=@flama/mobile --filter=@flama/frontend-mobile` (the `*-render.spec.tsx` budgets run in these) |
| `M-bundle` | `pnpm --filter @flama/web build && pnpm check:bundle` (`full` and `routine` only; web only) |

If `node_modules` is missing, run `pnpm install --frozen-lockfile` first. A
check that cannot run is a finding too (`M-<id>` with `"severity": "info"` and
the reason), never a silent skip. `check:compiler` exits 2 when an app's
compiler is not installed; that is a `M-compiler` at `info`, not a pass.

## Step 2: the review

A script already rejects wrong directories, forbidden imports, `useEffect`
outside `hooks/`, manual memo imports, nested component definitions, raw
colours, a query subscribed to for a single child in the obvious shapes, and a
route file over 120 lines. **Do not report those again**. Report them only when
the script missed a case, and say which script missed it.

For each component in scope, answer these questions before you look for rules
to cite:

1. **Which clocks update it?** A clock is anything that causes a re-render: a
   keystroke, a hover or press, an open/close, a query settling or refetching
   on focus (or on app foreground on mobile), a socket message, a
   `setInterval`, a route change, a parent's render.
2. **Where does the state for each clock live?** Is that the lowest component
   that reads it?
3. **On each tick, what re-renders, and does any of it not need to?** Count it:
   "every keystroke re-renders 8 rows × 5 cells".
4. **Would the React Compiler prevent it?** Usually it would not, and the
   finding stands. See below.

### What the React Compiler does not fix

The compiler is on in every app, and in both it gives up silently:

- `apps/web` builds with `react({ compiler: true })` in `vite.config.ts`.
  `@vitejs/plugin-react` runs the **oxc** port of the compiler
  (`oxc-transform-react`), with `panicThreshold: 'none'`.
- `apps/mobile` sets `experiments.reactCompiler` in `app.config.ts`, and
  babel-preset-expo adds `babel-plugin-react-compiler` with
  `panicThreshold: 'NONE'` in production builds.

A function either compiler cannot compile ships as written, and the build
prints nothing. The frontend packages are compiled too: the bundler resolves
the workspace links to their real paths, which the `node_modules` exclusions do
not match. `react-compiler-healthcheck` runs only the Babel compiler, with its
own options, and misses what oxc bails out on. `pnpm check:compiler` runs, per
app, the same compiler the app's build runs and lists every bailout.

The compiler memoises the JSX and values *inside* a component, keyed on their
inputs, so a child whose props did not change is skipped. For state held too
high, that means the cost with the compiler on is the parent's own body plus
every child whose props change on the tick. That is smaller than the cost
without the compiler, but it is not nothing. It cannot:

- **Move state.** When a parent's `setState` fires on a keystroke or a tick,
  the parent re-renders and so does every child whose props changed on that
  tick. State held too high is still too high (`R4`, `R6`).
- **Stabilise what really changes.** A controlled `value` passed to a list, or
  a context value holding a fast clock, changes on every tick, so every reader
  re-renders (`R3`, `R7`).
- **Narrow a subscription.** `useWatch()` without `name`, `watch()`,
  `formState` read at the top of a form, or a query without `select` all
  re-render their component on every change to anything they cover (`R5`).
- **Skip a component it bailed out of.** Mutating props, state or a module
  variable during render, reading or writing `ref.current` during render,
  a conditional hook call, `'use no memo'`, and any `eslint-disable` of
  react-hooks rules make the compiler leave the whole component
  unmemoised, silently (`R10`). react-hook-form's `watch()` is on the
  compiler's list of incompatible libraries. oxc also bails out on a default
  parameter that is an arrow function or an expression
  (`filter = (a, b) => …` in a props destructure) and on a `throw` inside
  `try`. `pnpm check:compiler` lists every case.
- **Keep an identity the data source throws away.** TanStack Query's
  structural sharing keeps an unchanged row's identity only for plain objects
  and arrays. The product package's entities are classes (`ApiTokenEntity`,
  `ProfileEntity`, …), so every refetch hands every reader a new object per
  row, and every memo keyed on one misses. A getter or `select` that builds an
  object does the same on every read (`R12`).
- **Make an impure render correct.** `Date.now()`, `new Date()` or
  `Math.random()` read during render, including through a helper's default
  parameter, gets cached on the inputs the compiler can see, so a relative
  time stops moving until something unrelated changes. That is a correctness
  bug the compiler introduces (`R13`).

The render budgets (`*-render.spec.tsx`) run with the compiler **off** on
purpose (`@flama/tsconfig/vitest-frontend.mjs`): they measure the component's
shape, which is what these rules are about. A profiler run with the compiler on
will not show you any of this.

### The UI pass

The questions above find render cost. Rendering correctly on the design
system is a separate pass, and it gets skipped when the render questions
come up empty, so run it on every file in scope that returns JSX:

1. **Design system first (`U1`).** Read the app's design-system barrel in full
   (`packages/frontend/design-system/web/src/index.ts` for web,
   `packages/frontend/design-system/mobile/src/index.ts` for mobile), then the
   table under "Reach for the design system" in `.agents/rules/frontend-ui.md`
   and the kit's own components (`DataTable`, `DataTableSearch`,
   `SectionCard`, … in `@flama/frontend-web`; `FormField` and friends in
   `@flama/frontend-mobile`). A `div`/`View` or `p`/`Text` styled as a
   callout, an empty state, a status badge, a chip or a summary, where the
   design system or the kit ships one, is `U1`. That holds even when every
   class is a token, because `lint:design` only checks the classes, not what
   the markup builds. A `role="alert"` on a hand-built box is the tell.
2. **Every string the user can read goes through `t()` (`U3`).** That
   includes `aria-label`, `accessibilityLabel`, `placeholder`, `title`, CSV
   headers and template literals.
3. **Colour outside the linter's reach (`U2`)**, **forms (`U4`)**, and the
   web-only rules `U6`–`U10` where the file is in `apps/web` or the web kit.

### Evidence bar

Report a finding only when you can state all four of: the clock, where its
state lives, what re-renders on each tick (with a count where you can get one),
and the fix. "This could re-render" is not a finding. If a code comment
already argues for the shape (the rules name several deliberate exceptions,
such as a `rowActions` dialog's open state living in the table, or two
siblings sharing one query and saying so), weigh the argument. Report it only
if the argument is wrong, and say why.

Prefer a missed finding to a wrong one. Each finding carries `confidence`
(`high` or `medium`); drop anything lower.

## Step 3: the fixes (`--fix` and `routine` only)

Fix the findings of this run that meet all of these, and leave the rest
reported:

- `confidence` is `high` and `severity` is not `info`.
- The rule is one whose fix is local: `M-biome`, `M-structure` (a misnamed
  kind directory or a route over the cap), `R2`, `R3`, `R4`, `R5`, `R8`,
  `R9`, `R10`, `R12`, `R13`, `U1`, `U2`, `U3`, `U10`, or `R11` when the fix is
  a new `*-render.spec.tsx` modelled on an existing one. Everything else
  (`P*`, `R1`, `R6`, `R7`, `U4`, `U5`–`U9`, `U11`, `M-arch`, `M-design`,
  `M-compiler`, `M-render`, `M-bundle`) moves code between packages, splits a
  component, changes a budget, an endpoint or a URL, or needs a new e2e spec:
  a person decides those.
- The fix stays inside `apps/web`, `apps/mobile`, `packages/frontend/*` and
  `packages/translations`, changes no URL or route, no public export of a
  package, no API call, and no render budget's number. A `U3` fix adds the key
  to every locale's `{area}.json` and runs
  `pnpm --filter @flama/translations assemble`; a locale you cannot translate
  with confidence keeps the finding open instead.
- The finding is not in a file an open pull request already changes (a
  person is working there), and no earlier fix pull request for the same
  fingerprint was closed without merging (a person said no; say so in the
  report instead).

How:

1. Fix one finding at a time, the smallest change that removes it, following
   the rule the finding cites. Do not refactor around it, and do not fix a
   neighbour the audit did not report.
2. After the fixes, run every Step 1 check again, plus the typecheck of each
   package you touched (`pnpm --filter @flama/web exec tsc -b`,
   `pnpm --filter @flama/mobile lint`, which runs `tsc --noEmit`, and
   `typecheck` or `build` in each frontend package). A fix that makes any check
   fail that passed before, or that you cannot get green, is reverted and its
   finding stays open with the reason. Never loosen a check, a budget or a rule
   to get green.
3. Re-run Step 2 on the files you changed. A fix that brings in a new finding
   is reverted.
4. When at least one fix survives, run `pnpm ci:local`, then commit on a
   branch `frontend-audit/fix-<YYYY-MM-DD>` from the audited `HEAD`, one
   conventional commit per rule (`fix(web): <rule> — <what>`, scope the
   package touched), push it, and open one pull request, ready for review,
   titled "Frontend audit fixes <YYYY-MM-DD>". Its body lists each fix by
   fingerprint with the finding's summary, the checks you ran and their
   results, and the findings you left for a person and why. If an earlier
   `frontend-audit/fix-*` pull request is still open, push to its branch
   instead (merging the default branch into it first) and update its body,
   so there is only ever one.
5. With nothing left to fix, push nothing and open nothing. Without a way to
   push or open a pull request (no remote, no GitHub access), leave the fixes
   committed on the local branch and say so in the report.

A fixed finding stays in the report and the JSON block with
`"fixed": "<pull request URL or branch>"`. It is resolved only when a later run
no longer finds it on the default branch.

## Rule catalog

IDs are stable. Add new ones at the end and never renumber them, because a
tracking issue and the evals key on them. The source is a section heading in
`.agents/rules/frontend-architecture.md` unless the row says otherwise.

| ID | Rule | Source |
| --- | --- | --- |
| `P1` | Placement: logic in a platform kit, UI in a product package, a kit concern that needs a product hook | "Placement: four questions, in order"; "The kit is concerns, not kinds" |
| `P2` | A feature named after a screen rather than a module | "A feature is named after a module" |
| `P3` | A helper written a second time instead of promoted to the kit | "Imports flow one way", "Patterns agents get wrong" |
| `P4` | A route file doing more than compose: logic, queries or JSX beyond mounting a screen | "Imports flow one way" |
| `R1` | A query subscribed to above the component that renders its result, held for one child | "Fetch in the component that renders the result" |
| `R2` | A prop a component only forwards and never reads | same |
| `R3` | A live input value reaching a component that renders a list | "A live input value is never a prop of a component that renders a list" |
| `R4` | State held above the lowest component that reads it | "State lives in the lowest component that reads it" |
| `R5` | A subscription wider than its reader: page-level `useWatch`/`watch`/`formState`, a query without `select` whose rows read one field | "Subscribe at the leaf" |
| `R6` | One component owning jobs on different clocks, so each clock redraws the others | "A component owns one job" |
| `R7` | A context whose value mixes change rates, or changes identity on every render | "Contexts split by change rate" |
| `R8` | A collection or `Map` rebuilt each render and passed to many children or a column factory | "Patterns agents get wrong" |
| `R9` | An effect that derives state, resets on a prop change, chains updates or fetches, or does not name the system it synchronises with | "An effect synchronises with something outside React" |
| `R10` | Code the React Compiler bails out of or never compiles, on a clock that matters | "The React Compiler is on"; this skill, "What the React Compiler does not fix" |
| `R11` | A component with a fast clock (typing, a stream, a timer, a list of more than a few rows) and no `*-render.spec.tsx`, or a budget that misses one of its clocks | "A component whose cost is the point gets a render budget" |
| `R12` | Query data that loses its identity on every refetch or poll (class instances with no `structuralSharing` function, a getter or `select` that builds a new object), under a component that renders a list or sits on a poll | this skill, "What the React Compiler does not fix" |
| `R13` | A render that reads the clock or randomness, which the compiler then caches | same |
| `U1` | Hand-built markup where the design system or the kit ships the component | frontend-ui.md "Reach for the design system before writing markup"; design-system/AGENTS.md on mobile |
| `U2` | A colour outside the token vocabulary that the linter did not catch (an inline `style`, a `dark:` override, a shadcn alias) | frontend-ui.md "One colour vocabulary: the brand primitives" |
| `U3` | A user-visible string not going through `t()` | frontend-ui.md "Translate everything the user can read, including downloads" |
| `U4` | A form not built as React Hook Form over a shared Zod schema (`Controller` per field on mobile), a schema carrying its own messages, or a form that fetches | forms.md; frontend-architecture.md "A feature holds kind directories, and nothing else" |
| `U5` | A web screen wired to the API with no spec in `e2e/tests/web/` | frontend-ui.md "Every product surface gets an end-to-end spec" |
| `U6` | A `Select` over a list the workspace grows, where an autocomplete belongs | frontend-ui.md "A picker over a list the workspace grows is an autocomplete" |
| `U7` | A dialog that scrolls in its card, or a capped list inside a dialog that already scrolls | frontend-ui.md "A tall modal scrolls in its body, never in its card" |
| `U8` | A table's search, filters, sort or page in `useState` instead of `useTableQuery`, a second debounce, or a search answered in the browser | frontend-ui.md "A table's query lives in the URL" |
| `U9` | A gated nav row whose `policies` are written out instead of taken from `ENDPOINT_POLICIES` | frontend-ui.md "A gated nav row's permissions are the endpoint's own" |
| `U10` | A date formatted without the core helpers and the reader's locale, or an `Intl` formatter built in render | frontend-ui.md "Where code goes" |
| `U11` | A placeholder number: a stat, badge or count with no query behind it | frontend-ui.md "Never ship a placeholder number" |
| `M-*` | A mechanical check failed | Step 1 |

A rule that seems wrong or unenforceable as written is not a finding against
the code. List it under **Rules to revisit** in the report.

## Output

A short report, in this order:

1. **Checks**: one line per `M-*` check: pass, fail, or could not run.
2. **Findings**, highest cost first. For each: ID, `file:line`, one sentence
   on the clock and what it re-renders or breaks, and the fix.
3. **Rules to revisit**, if any.

Then a fenced `json` block. It is the machine-readable result, and it is always
the last thing in the output:

```json
{
  "mode": "full | diff | routine",
  "base": "<sha or null>",
  "head": "<sha>",
  "checks": { "M-structure": "pass | fail | skipped", "...": "..." },
  "findings": [
    {
      "rule": "R4",
      "file": "apps/web/src/features/api-tokens/sections/token-table.tsx",
      "line": 88,
      "symbol": "TokenTable",
      "severity": "high | medium | low | info",
      "confidence": "high | medium",
      "clock": "keystroke in the table search",
      "compiler": "does-not-prevent | reduces | prevents",
      "summary": "One sentence.",
      "fix": "One sentence."
    }
  ]
}
```

`compiler` says what the React Compiler does about the cost: `does-not-prevent`
(the cost is the same with it on), `reduces` (it skips the children whose props
are stable, but the component itself still re-renders on the clock), or
`prevents` (a rule break the compiler happens to make free, which is still a
finding, at `low`, because the compiler bails out silently and the next edit
can bring the cost back).

With `--fix`, a finding the run fixed also carries `"fixed": "<pull request
URL or branch>"`, and one left alone that Step 3 would otherwise have taken
carries `"not_fixed": "<why>"`.

A finding's fingerprint is `rule:file:symbol`. Keep `symbol` the component or
function name, not a line number, so the finding survives an edit above it.

Severity: `high` is a check failing, or a re-render of a list or of a whole
screen on a fast clock. `medium` is a real rule break with a bounded cost.
`low` is a rule break with no measurable cost today.

## Routine mode

Optional. A project that wants the audit daily points a scheduled Claude Code
routine (claude.ai → Routines, or any scheduler that runs `claude -p`) at
`/frontend-audit routine` in a fresh session on the default branch; nothing in
the repository schedules it. It needs a GitHub remote and the GitHub tools or
`gh`. In this mode:

1. Find the open GitHub issue labelled `frontend-audit`. Its body ends with
   `<!-- frontend-audit: last-sha=<sha> -->`. If there is no issue, create
   the label if it is missing and an issue titled "Frontend audit" with it.
2. Scope: `full` on Mondays, when there is no `last-sha`, or when `last-sha`
   is no longer an ancestor of `HEAD`. On other days, `diff --base <last-sha>`.
   When nothing under `apps/web`, `apps/mobile` or `packages/frontend` changed
   since `last-sha`, run only Step 1.
3. Run Step 3 on the findings, open and new, whose file this run's scope
   covers. The fix pull request is the only thing the routine pushes: never
   push to the default branch, never merge, never approve.
4. Rewrite the issue body: the check table, the open findings grouped by
   rule (a finding from an earlier run stays open until a run whose scope
   covers its file no longer finds it on the default branch), each marked
   with the fix pull request that addresses it or the reason it was left for
   a person, and the new `last-sha` marker.
5. Add a comment only when something changed: new findings, resolved ones, a
   check that changed state, or a fix pull request opened or updated. List
   them by fingerprint and link the pull request. No comment on a quiet day.
   Never @-mention anyone and never assign.

Without GitHub access, `routine` degrades to `full --fix`: write the report,
leave the fixes on a local branch, and say what could not be published.
