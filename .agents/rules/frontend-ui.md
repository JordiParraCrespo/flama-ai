---
paths:
  - "apps/web/**/*"
  - "apps/web-showcase/**/*"
  - "packages/design-system/web/**/*"
---

# Frontend UI Rules

Every rule here was written after finding the thing it forbids, more than once,
in this repo. Each one names the failure it exists to stop.

## Reach for the design system before writing markup

Before styling a `div`, check whether `@flama/design-system-web` already ships
it. The barrel is the index — read it, do not guess from memory.

**Read the whole file.** Grepping for `export` is worse than useless here: most
of the barrel is multi-line, so the match is a bare `export {` and the names on
the following lines never print — `Alert`, `Breadcrumb` and `Collapsible` among
them, which are exactly the components this rule exists to stop you rewriting.

To list the names rather than read 260 lines:

```bash
node -e "console.log(require('fs').readFileSync('packages/design-system/web/src/index.ts','utf8').replace(/\s+/g,' ').match(/\{[^}]*\}/g).join('\n'))"
```

The failure this prevents: an error callout was hand-rolled in nineteen places
while `Alert` sat exported and used by six screens; empty and loading states in
five while `EmptyState` was used by one; a whole second table beside
`DataTable`. Nobody decided to do this — each screen was written without
looking, and the duplicate was cheaper to type than to find.

Specifically:

| Need                                  | Use                           | Not                                                   |
| ------------------------------------- | ----------------------------- | ----------------------------------------------------- |
| Whole-form or whole-page failure      | `Alert variant="destructive"` | a styled `div`, a bare `<p class="text-destructive">` |
| A success                             | `toast.success()`             | an `Alert`, an inline row                             |
| Field validation                      | `Field` + `FieldError`        | either of the above                                   |
| "Nothing here" / "still loading"      | `EmptyState`, `Skeleton`      | a centred paragraph                                   |
| A list with paging, search or filters (`apps/web`) | `DataTable` | `Table` primitives directly |
| Picking one value out of a list the workspace grows (a teammate, a resource) | `Combobox` | `Select` over the first page of an endpoint |
| Lifecycle state | `Badge` with `active` / `paused` / `ended` / `draft` | `secondary`, `outline`, `destructive` |
| Quiet metadata chip                   | `Badge variant="neutral"`     | `secondary`                                           |
| A dialog taller than the viewport | `DialogBody` around its middle | `overflow-y-auto` on `DialogContent` |

`DataTable` lives in `apps/web/src/components/`, not in the design system, so
that row applies to the product app only — a paged list in `apps/web-showcase`
has to build on the `Table` primitives until somebody moves it into the shared
package.

Every table in `apps/web` goes through `DataTable` — team members, roles and
API tokens. Hand-rolled cards wrapping the `Table` primitives had, between
them, three header heights, three empty states and three ideas of how big a
button in a toolbar is.
So a `Table` primitive imported into the product app is now a signal on its own,
and needs a comment saying why this list is the exception.

The header is one row of controls at one height:
`TABLE_HEADER_CONTROL_SIZE` from `components/data-table.tsx`. Anything you hand
`DataTable` that lands in that bar — a `bulkActions` button, a menu trigger —
takes the same size. A heading or a line of description goes **above** the
table (`GroupHeading` does both), never inside the bar.

## A picker over a list the workspace grows is an autocomplete

A `Select` is right when the options are the product's: a stage, a source, a
status, a segment. It is wrong the moment the list is the *workspace's* —
teammates, tracked resources — because that list has no ceiling, and a menu
has no way to look inside itself.

Which control, by what the field is picking from:

| The options are | Use | Notes |
| --- | --- | --- |
| Fixed and short, known at build time | `Select` | A search box over eight rows is furniture |
| A workspace list, one value, in a labelled field | `Combobox` | Sits at the field radius, next to `Input` |
| Thousands, several values, fetched per keystroke | `AsyncMultiSelect` | Windowed, chips pinned on top |
| A toolbar filter rather than a field | `SelectMenu` (one) / `FilterMenu` (many) | Chrome: a pill, never a `FieldLabel` |

`Combobox` is a form control — `Field` + `FieldLabel` + `Combobox`, wired
through a `Controller` like any other ref-less control (see
[`forms.md`](./forms.md)), with `clearLabel` for the "Unassigned" row. Point its `onQueryChange` at the query that fetches the options, and the
search is the API's to answer, which is the same rule the tables follow: a
control that filters the page it already holds will answer a name the workspace
plainly has with "no matches" as soon as that name is on page two. Client-side
filtering is the fallback for a list the caller genuinely holds in full.

The failure this prevents: a dialog picked an owner and a resource out of two
`Select`s fed `{ limit: 100 }`. On the seed that reads fine; on a workspace
with more records than that it silently cannot reach them, and even inside the
hundred, finding one by name meant scrolling a menu with no search in it —
reported twice.

The threshold, since somebody always asks: if the option list is fetched from
an endpoint, it is an autocomplete. Do not wait for a workspace to grow into
the bug.

## A tall modal scrolls in its body, never in its card

`DialogContent` is a flex column capped at the viewport and it does not scroll.
Put the middle of a long dialog — the fields, the permission list — inside
`DialogBody`, leaving the hero, header and footer as siblings so they stay
pinned. `max-h-… overflow-y-auto` on the `DialogContent` itself is the thing
this replaces.

The failure this prevents: four dialogs scrolled the card. A scrollbar there is
painted inside the padding box, so it ran across the rounded top-right corner
and took ~15px off the content box — which is exactly the width `DialogHero`'s
`-mx-6` counts on, so the gradient band stopped short of the edge and left a
grey gutter down the side of the card. The close button scrolled away with the
content, too, being positioned against the same box.

One dialog gets one scrollbar. Both permission lists had capped their own
height inside a card that was already scrolling, which gave the reader two bars
and a wheel that stopped dead at the list's edge; they now let the body scroll.

Pinning is given up below 520px of viewport height — the card scrolls again,
body included. There is a height at which the hero, header and footer alone are
taller than the cap (roughly 340px for a hero dialog: a phone in landscape, a
desktop window at 400% zoom), and pinned regions that do not fit leave the body
nothing to shrink into: it collapses to zero and takes the fields with it,
behind a card that clips. The two breakpoints in `dialog.tsx` are complements
with nothing between them, which is the point — a body that keeps `min-h-0`
while the card clips is a body that collapses.

## A table's query lives in the URL

Search, filters, sort and page go through `lib/use-table-query.ts`, which keeps
them in the query string with **nuqs**. Never `useState` for any of the four:
state dies on reload, and a filtered table is a thing people paste into a
message. Two rules come with the hook rather than being retyped per screen —
narrowing the list returns to page one in the same update, and the URL write is
debounced so typing costs one history entry rather than one per keystroke.

**Every table's search is the server's job, and it is debounced.** Hand a query
`searchQuery` — the debounced value — and the input `search`, which updates on
the keystroke so typing never lags. One request per search, not one per
character. No screen filters rows in the browser to answer a search box: team's
members and roles both did, over whichever page they happened to hold, and both
now send `search` to the endpoint.

**A search has to match everything the row shows.** Both endpoints were widened
to make that true rather than the tables narrowed to what the endpoint already
did: members matches assigned role names as well as name, email and
organization role, and roles matches the description under the name. A search
answering a visible phrase with an empty table is the bug this rule exists to
stop.

**A facet is the server's job too.** The members role facet picks role *ids*,
and `GET /:orgId/members` was widened to take them (`?roleIds=`) rather than
leaving the tab to narrow the rows it had already been handed. Narrowing after
the response is not a filter: `paginateRows` slices what it is given, so a facet
applied in the browser trims the six rows on screen and leaves every other match
on a page nobody opens — and a filter that is not in the request is one the CLI,
an MCP tool and the CSV export cannot ask for. Rows the endpoint knows nothing
about follow the same answer rather than sitting out: the members table appends
pending invitations, which hold no assigned role, so a role facet drops them.
Leaving them in is what made the facet read as broken — the reader picked
"superadmin" and went on looking at rows that plainly were not.

Two tables on one route (team's members and roles tabs) each take a `prefix`,
or they fight over `?q=`. And a route with `validateSearch` **must carry
unknown keys through**: what it returns *becomes* the search, so a narrowed
return deletes whatever the table wrote on the next navigation. `/settings` is
the one that does this and says so.

A list the server hands over whole is sliced with `lib/paginate-rows.ts`, which
turns that page into the `pagination` prop `DataTable` expects. It exists so
"the endpoint has no `page` parameter" does not turn into "this screen renders
every row it was given".

## A nav row's permissions come from the shared screen catalog

`NAV` in `apps/web/src/components/app-shell/nav.ts` takes each row's
`policies` from `SCREENS` in `@flama/shared/navigation`. Do not write a policy
list out in the nav file, and do not add a row for a screen with no entry in
that catalog: `apps/api/src/auth/__tests__/screen-policies.spec.ts` asserts that
each screen's endpoint carries exactly the rules `SCREENS` names, so a
`@CheckPolicies` that moves takes the sidebar with it.

The failure this prevents: a screen declared `policies: []` — "show this to
everyone" — while the endpoint behind it demanded `read Member`. A plain
member was offered a link that could only answer 403, under a heading that
promised them the team. Two separate declarations of one rule drift the moment
somebody edits only the one they are looking at.

Routing follows the same rule. A screen the product picks for the reader — the
dashboard, which `/` redirects to — must check its own policies and send them
somewhere they can act, not render the refusal. `useLandingRoute` is that
choice, and it answers `null` rather than bouncing a reader who can open
nothing between two errors. A signed-in account with no workspace at all is
sent to `/onboarding` by the `_authenticated` layout for the same reason.

## One colour vocabulary: the brand primitives

Use `text-ink-900/600/400`, `bg-surface-*`, `border-border-*`, `--accent-*`,
`--status-*`. **Not** shadcn's semantic aliases (`text-muted-foreground`,
`bg-muted`, `text-foreground`) even though they resolve to the same values, and
never a raw hex or a stock Tailwind colour (`text-amber-600`).

The failure this prevents: two names for one grey drifting across six files,
and `role-pill.tsx` hardcoding nine hex values that were _already tokens_, so
role dots did not move when the theme did.

If a colour genuinely is not in the palette — it happens; the theme toggle has
three that deliberately do not invert — add it to
`packages/design-system/web/src/styles/globals.css` as a named token with a
comment saying why. A brand-wide change has to be able to find it.

## The design-system linter enforces the two rules above

`pnpm lint:design` runs [`@shadcn/lint`](https://github.com/shadcn-ui/lint)
through oxlint over every web and mobile app; each app's own `lint:design`
script points at the configuration its design system ships
(`packages/design-system/web/oxlint.design.json`,
`packages/design-system/mobile/oxlint.design.json`) — the package that owns
the components owns the rules for using them. On the web it reads
the real theme from `globals.css`, so it knows which colours exist, and it
knows which imports are design-system components, so it can tell a layout
class from a restyle. Biome still owns correctness; oxlint's own rule
categories are switched off so the two never overlap.

The mobile configuration is the same rules minus two. The plugin only reads a
Tailwind v4 theme and the mobile apps are NativeWind on Tailwind 3, so
`no-unknown-classes` would judge against v4's class set (`flex-grow` is valid
in 3, flagged in 4) and `no-inline-styles` would flag React Native's `style`
prop — NativeWind's `vars()`, Expo's `<StatusBar style>` — which is not CSS.
Both are off there. `no-raw-colors` still catches the stock palette
(`text-blue-500` in `login.tsx`); it just cannot list the theme's tokens.
`apps/mobile-showcase` lints `app` and `lib` only: `registry/` holds demo
copies of component sources, which restyle primitives by design.

What each rule catches, and how it is set:

- `no-raw-colors` / `no-unknown-classes` — a colour utility the theme does not
  declare. **These are always bugs**: Tailwind generates nothing for them, so
  the element silently gets no colour.
- `no-arbitrary-values` — `size-[17px]` when `size-4.25` is the same value on
  the scale, or an off-scale value that should become a token.
- `no-restyle` — spacing, colour, shape or typography overriding a component
  that owns it (`gap-0 py-0` on `<Card>`; a `<Badge>` recoloured by hand).
  Layout classes on a component are allowed; so is colouring an icon, which
  the design system deliberately leaves to the caller.
- `no-inline-styles` — a `style` attribute. The three that exist are
  data-driven (`width: column.width`, a role's colour from the database) and
  cannot be classes; disable the rule on those lines rather than move them.
- `require-static-classes` is **off**: it cannot read through a shared class
  constant like `className={authInputClass}`, and shared constants are the
  convention here (see "The second time you write a helper, move it to
  `lib/`" below).

Every rule is at `warn` while the findings it inherited are worked off — at
integration: web 234, admin-web 118, web-showcase 69, mobile 75, admin-mobile
80, mobile-showcase 7. Promote a rule to `error` in the design system's
`oxlint.design.json` once its count reaches zero; from then on it fails CI.
Do not lower a rule
back to `warn` to land a change. One known false positive to keep in mind
before promoting `no-raw-colors`: the plugin reads `shadow-panel` as a shadow
*colour* and reports it undeclared, though `--shadow-panel` is a real shadow
token.

The failure this prevents: on its first run the linter found four colour
classes that had never existed — `text-ink-500`, `hover:text-ink-700`,
`bg-surface-50` and `bg-chrome-bg` — each rendering nothing, across both web
apps. `--chrome-bg` was a real variable feeding `--popover` and `--sidebar`,
but it had never been exposed as `--color-chrome-bg`, so the top bar's
background class was inert. Nothing in the type checker, the tests or the
bundle budget can see a class that Tailwind quietly drops.

## Every component export belongs in the barrel

`packages/design-system/web/src/index.ts` must re-export everything a file in
`src/components/` exports. `pnpm --filter @flama/design-system-web test` fails
the build otherwise.

The failure this prevents: `Breadcrumb` and `Collapsible` shipped, styled and
building, but absent from the barrel — so a detail page hand-rolled a
breadcrumb rather than discovering one existed. A component nobody can find is
a component somebody will rewrite.

Both were still importable as `@flama/design-system-web/breadcrumb`, and
`apps/web-showcase` imports every component that way. `apps/web` does not: it
takes components from the root and only icons by subpath, so for the product
app a missing barrel entry is a component that does not exist.

If something must stay internal, do not export it from its own module either.
That is the honest way to say "internal", and the check cannot see it.

## The second time you write a helper, move it to `lib/`

Anything that is not a component and is used by more than one screen goes in
`apps/web/src/lib/`. Check there first — it already has `download-csv`,
`format-date`, `use-locale`, `use-copy`, `use-error-message`,
`use-zod-resolver`.

The failure this prevents: CSV export written out four times, each with its own
cell-quoting — four chances to break on a member called "Smith, Jane";
copy-to-clipboard four times, none of which cleared its timer on unmount; and
`Intl.DateTimeFormat` constructed inside render in eight files, once per table
row.

Two specifics that keep biting:

- **Dates.** Format through `lib/format-date.ts` and take the locale from
  `useLocale()`. Never `toLocaleDateString()` with no locale — that ignores the
  user's language setting outright, which is exactly what the API-tokens table
  did. Never `i18n.language` or a bare `i18n.resolvedLanguage`: the first is
  wrong after a fallback and the second is `string | undefined`.
- **Constructing an `Intl` formatter in render.** They are expensive and pure;
  `dateFormatter()` caches them.

## A route file composes; it does not contain

A file under `src/routes/` holds its `Route`, its page component, and the
queries that feed them. Dialogs, cells, tabs and helpers live in
`src/components/<feature>/`. `components/team/` is the reference shape.

The failure this prevents: `team.tsx` reached 1,455 lines and twenty
declarations — six dialogs, a table, and private copies of `formatDate`,
`titleCase` and `csvCell` — while the sibling feature next to it was already
split. Splitting is free before someone branches off it and not after.

Layout vocabulary shared by more than one feature goes at the top of
`components/`, not inside the feature that happened to need it first — see
`components/section-ui.tsx`, which both settings and profile are built from.

## Never ship a placeholder number

If the real value is not available, render nothing. No badge is honest; a wrong
badge is not.

The failure this prevents: a demo-data file hardcoded `team: 5` (and more) and
the sidebar rendered them to every user for months.
The file said itself that they stood in "until the shell navigation is
connected" — and stayed after it was.

The pattern to copy: a component names the total it wants and the shell
resolves it from a query (`useNavCounts` in `app-sidebar.tsx`). An unresolved
total is `undefined` and renders as no badge.

## Translate everything the user can read — including files they download

Every user-facing string goes through `t()`. That includes CSV headers and
enum values written into an export.

The failure this prevents: the team export hardcoded
`['Name', 'Email', 'Organization role', ...]` twenty lines from another export
that translated its own, so a Spanish user exporting both got one file in their
language and one not.

Machine-readable columns are the exception and should say so: an ISO-8601
timestamp stays ISO-8601, because a spreadsheet has to parse it and a localised
date is precisely what it cannot.

When a key stops being used, delete it from **every** locale in the same
change. Orphaned keys are invisible — nothing fails — and they accumulate.

## Every product surface gets an end-to-end spec

A screen wired to the API needs a spec in `e2e/tests/web/`. Conventions are in
[`apps/web/AGENTS.md`](../../apps/web/AGENTS.md) and [`e2e/README.md`](../../e2e/README.md).

The failure this prevents: team was the largest surface in the app and the most
recently connected, and it was the one without a spec — which is the wrong way
round.

## Dead code

Biome's `noUnusedImports` only looks inside a file, so an exported component
that nothing imports is invisible to it — a stub page sat exported and unused
long after every route it stood in for became real. When you delete the last
caller of something, delete the thing.
