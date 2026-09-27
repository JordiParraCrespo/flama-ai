---
paths:
  - "apps/web/**/*"
  - "apps/admin-web/**/*"
  - "apps/mobile/**/*"
  - "apps/admin-mobile/**/*"
  - "packages/frontend/**/*"
---

# Frontend Architecture Rules

Where a thing goes on the frontend, and what it may import. Every rule here is
checked: dependency-cruiser (`pnpm arch`) for imports, `pnpm check:structure`
for names, shapes and where a query is subscribed to, Biome for effects and
memo, Biome plugins in `biome-plugins/` for query keys, `skipToken` and
mutation cache updates (each plugin's header says what it matches, and
`biome-plugins/fixtures/` holds its cases), `pnpm check:compiler` for what the
React Compiler leaves uncompiled, and a `*-render.spec.tsx` for
what a component costs. The Claude Code Stop hook
runs all three. The layer model and the cookbooks are in
[`packages/frontend/ARCHITECTURE.md`](../../packages/frontend/ARCHITECTURE.md)
and each app's `ARCHITECTURE.md`; `/scaffold-feature` produces the shape.
What no script can see — which clock re-renders what — is review's, against
the render rules below.

Each rule below was written after finding the thing it forbids in a project
built from this starter.

## Placement: four questions, in order

| Question | Answer | Goes in |
| --- | --- | --- |
| Is it logic (an entity, a repository, a service, a query hook)? | used by both products | `packages/frontend/core` |
| | used by one product | `packages/frontend/consumer` or `/admin` |
| Is it UI or platform glue shared by both apps of a platform? | web | `packages/frontend/web` |
| | mobile | `packages/frontend/mobile` |
| Is it a primitive with the same API on both platforms? | | `packages/frontend/design-system/web` and `/mobile` |
| Everything else | | `apps/<app>/features/<module>/<kind>/` |

Two cells are never filled: logic in a platform kit (mobile would have to copy
it) and UI in a product package (it would need `react-dom` or `react-native`).
When something seems to need one of them it is two things glued together: the
hook goes down to a product package, the component sideways to the kit.

## A feature is named after a module

`features/<module>/` takes its name from a module of `packages/frontend/core`
or of the app's product package, or from the app's short allowlist
(`dashboard`, `public` in `apps/web`). Never after a screen: `settings/` held
`api-tokens` and `organizations`, `team/` held `roles`, `chat/` was
`conversations`, and every one of those cost an agent a search. If the module
does not exist, add it to the product package first; the domain leads.

## A feature holds kind directories, and nothing else

```
features/<module>/
├── screens/      # what a route mounts; may fetch, may use the router
├── sections/     # a pane, a table, a card group; may fetch
├── dialogs/      # one dialog per file, owns its mutation; may fetch
├── forms/        # React Hook Form over a shared Zod schema; props in, onSubmit out; never fetches
├── components/   # entity UI: row, cell, pill, hero; props only; never fetches
├── hooks/        # use-*.ts; queries + UI state; the only place an effect lives
├── lib/          # types, mappers, config; no JSX
└── __tests__/
```

- A kind directory holds files, never a sub-directory. `automations/panels/`,
  `inbox/detail/` and `creator/behavior/steps/` were three answers to one
  question. A feature that wants a sub-directory is two features.
- No `index.ts` inside a feature. A route imports the screen by its path. A
  barrel that re-exported twenty-five symbols protected nothing and cost Vite
  a chunk.
- Filenames are kebab-case with no kind suffix; the directory is the kind.

## Imports flow one way

```
design system ─► platform kit ─► features ─► routes
shared ─► core ─► consumer | admin ─► apps
```

- `features/<a>` never imports `features/<b>`. Forty-one such imports grew in
  one project before anyone noticed. What two features need moves to the
  kit when the second consumer appears, never before.
- `forms/` and `components/` never import `@flama/frontend-*/react`,
  `@tanstack/react-query`, `@tanstack/react-router` or `expo-router`. The
  section, dialog or screen above them fetches and passes the result down.
- A route file composes: it imports `screens/`, `sections/` and `dialogs/`,
  reads `lib/` for a search schema, and stays under 120 lines. A 680-line route was a page that had moved
  in.
- An app imports exactly one product package. `apps/web` loading
  `@flama/frontend-admin` fails `pnpm arch`.
- The kit is imported by its package name (`@flama/frontend-web`), never by a
  path into its `src/`.
- An app never keeps a file the kit ships. `pnpm check:structure` compares
  basenames; the fix is to import it.

## The kit is concerns, not kinds, at its top level

`packages/frontend/web/src/<concern>/<kind>/` — `shell`, `auth`, `table`,
`layout`, `forms`, `theme`, `i18n`, `analytics`, `platform`, `roles`. Each
concern has an `index.ts`; a concern imports another only through it. The
concerns are layered (leaves → middle → top) and `pnpm arch` holds the order:
a leaf imports no other concern at all, so a leaf that starts needing one
moves to the middle list in the kit's `.dependency-cruiser.cjs`. A concern that
needs a product hook is a feature, not kit. Logic with no platform in it (date
formatting, the CASL ability, a slug) is not kit either: it goes to core or the
product package, and the kit may re-export it.

## Render rules

Placement is checked by every rule above this heading. These are about what a
component *does*. They were prose, and unchecked, and broken in two different
apps by code that satisfied every other rule in this file — so two things check
them now: `pnpm check:structure` reads where a query is subscribed to, and a
`*-render.spec.tsx` measures what a component costs.

A cost rule is not a size rule. This section briefly carried a line cap per kind
and it was the wrong check: a section that owns the query, the column factory,
six dialogs and the row menu passes at 149 lines, and what the cap actually
produced was files split to land under it. If a component is doing two jobs,
name the jobs and split *those*.

- **Fetch in the component that renders the result, not the one that owns the
  layout.** `sections/`, `dialogs/` and `screens/` may all call a query hook, so
  "the section above fetches and passes down" does not mean the screen. A query
  a screen subscribes to only so that one sibling below it can render the
  result belongs to that sibling.

  `api-tokens.tsx` held `usePermissionCatalog()` and `useApiTokens()` for a card
  and a table, and passed `CreateTokenCard` three props it forwarded straight to
  the form and read none of. Every settle of the token list — a create, a
  revoke, a window refocus — went through the create form and the permission
  picker beside it. Two siblings genuinely sharing one result is a different
  thing and passes: `profile.tsx` fetches the profile once for its hero and its
  details pane, and says so in a comment. `pnpm check:structure` flags the
  single-consumer case, in route files as well as in features, and flags a
  data prop a `sections/` or `dialogs/` file only hands on (a `forms/` or
  `components/` file cannot fetch, so it may).

- **A live input value is never a prop of a component that renders a list.**
  What a reader is typing is the field's state until it settles. Hand the list
  the settled value.

  `DataTable` took `search.value` as a controlled prop, so every character
  re-rendered the header, all eight rows, forty cells, eight row menus and the
  pager — for a query that was debounced anyway and had not been asked yet, and
  through a render-phase `setSelection` that ran again each time. `DataTableSearch`
  keeps the half-typed word now and calls `onChange` once per burst. If you need
  the same shape elsewhere, copy that: state in the field, debounce on the way
  out, settled value on the way back down.

- **State lives in the lowest component that reads it.** A toggle belongs to
  the input, an open menu to the row, a draft to the field. A page holds only
  what two siblings share. The exception worth knowing: a dialog opened from a
  `rowActions` menu cannot own its own open state, because that menu's content
  unmounts when the popup closes — those stay with the table, and cost it
  nothing.
- **Subscribe at the leaf.** `useWatch`, `useController` and `useFormState`
  take `control` and run in the component that shows the value; `select`
  narrows a query to what a row renders. A page-level `useWatch` re-rendered a
  whole register page, art panel included, on every keystroke. `PermissionPicker`
  held one flat `Scope[]` for nine groups, so granting one re-rendered
  twenty-seven toggles; each row takes its own field off the form now.
- **A component owns one job, and the job is named by what updates it.**
  `data-table.tsx` held the search field, the rows and the selection: three
  things on three different clocks, so each one's update redrew the other two.
  The split that matters is by clock, not by length — a keystroke, a page, a
  tick. When you cannot name the second job, there isn't one.
- **One component per file.** Biome's `noNestedComponentDefinitions` is on.
- **An effect synchronises with something outside React, and says what.**
  A DOM listener, a subscription, a timer, an imperative library, the URL.
  Never deriving state, resetting on a prop change, chaining updates or
  fetching. It lives in a `hooks/` file with a one-line comment naming the
  system. Biome forbids `useEffect` anywhere else.
- **The React Compiler is on** in every app. No manual `useMemo`,
  `useCallback` or `memo` outside `hooks/` (where a library may need a stable
  identity). Biome forbids the import.

  It is an optimisation, not the structure. It memoises a badly-shaped
  component into a clean profile — measured, it took the picker above from
  twenty-seven wasted renders per click to zero, and the api-tokens screen's
  threaded query from one to zero — so a profiler will not show you any of
  this. That is why the two rules at the top of this list are checked rather
  than profiled, and why a `*-render.spec.tsx` runs with the compiler **off**.

  The converse is the trap: splitting a component into files does not isolate
  anything by itself. `DataTableRow` is its own file and a tick still redraws
  the page, because the setter that a tick calls lives in the shell above it.
  A split isolates an update only when the state that update writes moves with
  it.

  The compiler also gives up silently. The web build runs its oxc port and
  the Expo build its Babel plugin, both with the panic threshold at `none`, so
  a component neither can compile (a ref read or written during render, a
  default parameter that is an arrow function, a `throw` inside `try`,
  react-hook-form's `watch()`) ships unmemoised and nothing says so.
  `pnpm check:compiler` runs each app's own compiler over what that app
  bundles and lists every one.
- **A component whose cost is the point gets a render budget.** Name it
  `*-render.spec.tsx` and it runs in the `render-budget` vitest project, which
  does not enable the compiler. `data-table-render.spec.tsx` asserts that a
  keystroke renders no rows; `permission-picker-render.spec.tsx` that one click
  renders one row. Write the harness so the value feeds back the way the real
  caller feeds it, or the test passes on the shape it was meant to forbid.
- **Contexts split by change rate.** A provider that holds a value and its
  setters exposes them so a toggle does not re-render the tree.
- **Generic React hooks live in the design systems' `hooks/`.** `useControlled`
  (the `value` / `defaultValue` / `onChange` triple), `useDebouncedValue`,
  `useDebouncedCallback` and `useNow` are exported from
  `@flama/design-system-web` and `@flama/design-system-mobile` alike — same
  names, same signatures, same behaviour — because the design system is the
  lowest React package the kits, the apps and its own components all share,
  and a primitive both platforms need is mirrored there. A hook there knows
  nothing of the product or of a query; one that does belongs in a product
  package or a feature's `hooks/`. Before writing a timer, a
  controlled/uncontrolled pair or a latest-ref, check that directory.
- **A clock is an input, never a read in render.** `Date.now()` or
  `new Date()` inside render — including a helper's `now = new Date()`
  default, like `formatRelativeTime`'s — is cached by the compiler on the
  inputs it can see, so an age stops moving. Take the time from
  `useNow(interval)` in the lowest component that draws it and pass it in:
  `SessionRow` ticks once a minute for its own "last seen", so a tick
  re-renders one row and not the session list with its dialogs. A one-second
  countdown gets a leaf of its own for the same reason.
- **Entity queries opt into `shareEntities`.** The entities are classes, which
  TanStack Query's default structural sharing does not look into, and every
  `Date` in one is a new object, so without it every refetch hands every
  reader a new object per row. A query hook that returns entities passes
  `structuralSharing: shareEntities` (from `@flama/frontend-core/react`); a
  reader that needs one field of a list narrows it with `select`.

## Routing

`apps/web` routes with TanStack Router, where a file's name decides both its
URL and the layout chain that renders it, so renaming a route file is a URL
change. Before adding, moving or renaming one, read the `/tanstack-routing`
skill (`.agents/skills/tanstack-routing/`): the file-name table and the diff
that proves a restructure kept its URLs. `apps/mobile` routes with expo-router
and none of this section applies to it.

- **`routeTree.gen.ts` is generated.** Never edit it; commit it regenerated
  with the routes that changed it (`pnpm --filter @flama/web routes`, or any
  build or `dev`, all reading `tsr.config.json`).
- **A guard sits on the narrowest route that owns the decision.** A layout
  route renders chrome; when one layout serves subtrees with different
  answers, the layout carries no guard and each subtree gets a pathless child
  that carries its own (`_auth` → `_public`, `onboarding`). Opposite guards
  stacked on a shared parent are a redirect loop.
- **Redirects go through the kit.** `redirectSignedOut` / `redirectSignedIn`
  from `@flama/frontend-web` are a pair (`location.href` into `?redirect=`,
  then back out); any redirect target read from a URL goes through
  `sanitizeRedirect`, or it is an open redirect.
- **`validateSearch` returns the whole search.** A key it does not return is
  gone by the next navigation, so a route that cares about one key spreads the
  rest through (nuqs and a table's page key live there too). Keep it cheap: it
  is critical-path code `autoCodeSplitting` does not split, and a Zod schema
  comes from a narrow `@flama/shared` subpath or not at all.
- **`to` is a pathname.** A query goes in `search`, never in the `to` string,
  which would 404.
- **A guard is chrome, not authorization.** The API authorizes every request;
  whether a nav row shows is `policies` in `lib/nav.ts`. A precondition for
  the whole console is another entry in `_authenticated.tsx`'s `GATES`, not a
  second guard.
- **No route has a `loader`.** Screens read through TanStack Query and
  `defaultPreloadStaleTime: 0` leaves freshness to it, so there is one cache
  and one staleness rule. The first `loader` is an architectural change, made
  on purpose in its own diff.
- **A layout varies by page through route `staticData`**, read once off the
  innermost match with one `useMatches` select; the key's `declare module`
  augmentation sits beside its only reader, not in a shared types file.
- **A route an optional feature owns** is listed in that feature's `paths` in
  `scripts/starter/features.json`, and every line other routes spend on it is
  fenced (`flama:begin organizations`); `pnpm starter:check` holds it.

## Patterns agents get wrong

- Creating `components/<screen>/` at the app root. That is the pre-features
  layout; the checker rejects it.
- Naming a feature after the page (`settings`, `team`, `home`) instead of the
  module it renders.
- Adding a sub-folder inside `components/` when a feature grows. Split the
  feature, or promote to the kit.
- Writing a helper a second time instead of promoting the first.
- Putting `useWatch` or a query in the page and threading the value down. The
  page is where an agent lands first, and `/scaffold-feature` now hands it a
  screen *and* the section it composes for exactly that reason.
- Forwarding a prop a component never reads, so the thing below it can have a
  value the thing above it fetched.
- Letting a controlled input's value reach a component that maps over rows.
- Splitting a file to satisfy a number, and reporting the split as a fix.
- Passing a whole collection to a cell that needs one entry of it: a `Map`
  rebuilt each render invalidates the column factory that closes over it, and
  every cell with it.
- Reaching for `useEffect` to reset a form when a prop changes: React Hook
  Form's `values` option does it.
- Hand-rolling a debounce timer or a `value ?? internal` pair in a component
  when the design system's `hooks/` already has it.
- Renaming a route file without checking the URL it produces. In file-based
  routing a rename is a URL change; `/tanstack-routing` has the diff that
  catches it.
- Putting two opposite guards on one shared layout route instead of giving
  each subtree a pathless child that carries its own.
