---
name: scaffold-feature
description: Build a frontend feature in a Flama app (apps/web, apps/mobile, and apps/admin-web or apps/admin-mobile when those plugins are installed) the way a senior frontend engineer on this codebase would. It starts from the domain module, writes down every query and mutation and which component draws each result, then places each piece in its kind directory, and it ends with the checks passing. Use it whenever the user asks for a new screen, page, section, dialog, form, table, list, settings pane or UI flow in a frontend app. Also use it when they describe a feature that needs UI ("let people manage webhooks", "show invoices in the app"), when a new API endpoint needs a screen, or when they ask to review, fix or refactor a frontend feature, even if they never say "feature" or "scaffold".
---

# Build a frontend feature

This skill turns a request into a feature that passes review here and still
holds up when the next person changes it. The standard is three rule files,
and you should read them first:

- `.agents/rules/frontend-architecture.md`: placement, what may import what,
  the render rules.
- `.agents/rules/forms.md`: React Hook Form over a shared Zod schema.
- `.agents/rules/frontend-ui.md`: design system first, the colour vocabulary,
  tables, dates, translations, e2e.

This skill is the process that gets you there. The rules are applied because
of the reads and writes the feature makes, not recited from memory.

The reference features: `apps/web/src/features/api-tokens` (a create card, a
table with a row menu, a confirm dialog) and `packages/frontend/consumer/src/modules/organizations`
with `react/organizations.queries.ts` (the domain module and its key ladder).
Read the one closest to your task before writing.

## 1. Decide the size of the change

Most requests are one or two files in a feature that already exists, not a
new feature. Before creating anything, answer these:

- **Which app?** `web` or `mobile` is the consumer product; `admin-web` or
  `admin-mobile` is the control plane (a plugin). A request that names no app
  usually means `web`. When both platforms need the feature, the logic goes
  in the product package once and each app gets its own UI.
- **Which module does the UI render?** A feature is named after a module of
  `packages/frontend/core` (`auth`, `users`, `user-settings`, `capabilities`,
  `analytics`, `feature-flags`) or of the app's product package
  (`packages/frontend/consumer`: `organizations`, `profile`, `api-tokens`), or
  is on the app's allowlist (`dashboard`, `public`). Never name it after a
  page (`settings`, `team`, `home`). `ls packages/frontend/*/src/modules`
  shows what exists.
- **Does the feature exist already?** Then add a file to the right kind
  directory, and do not run the generator.
- **Does the API serve it?** Look for the endpoint in `apps/api/openapi.json`
  and the generated client in `packages/frontend/api-client`. If it isn't
  there, the backend comes first (`/scaffold-module`, then
  `pnpm generate:api-client`), or the feature waits. Never fake data: see
  "Never ship a placeholder number".
- **What does the API allow and refuse?** Read the controller behind each
  endpoint, not only its path:
  - its `@CheckPolicies`, which is the permission each action needs;
  - the errors it throws;
  - the business rules enforced below it, in the domain entity or the Better
    Auth config (for example, the last workspace can't be deleted, or a
    revoked token can't be renamed).

  The UI mirrors all of these (step 3). An action the server would refuse is
  not offered, or it says why.
- **Build what was asked.** A filter, a key variant or a column that no screen
  uses is dead code on the day it lands. Note it as a follow-up instead.

When something here changes the design and cannot be inferred, ask. Otherwise
state your assumption in the summary and move on.

## 2. The domain leads: the module in the product package

When the module does not exist, or lacks the call you need, add it before any
UI. Put it in `packages/frontend/consumer`, or in core when both products use
it. The steps are the "Add a module to a product package" cookbook in
`packages/frontend/ARCHITECTURE.md`, with the code in
`references/templates.md` §1–3. In short:

1. **Entity:** a class with readonly fields and derived getters (`isActive`,
   `initials`). It is what the UI needs, not the DTO.
2. **Errors:** `THINGS_CLIENT_00n` fallbacks, used only when the API sent no
   problem document.
3. **Repository:** calls `@flama/api-client`, maps DTOs to entities, puts
   `@MapApiError` on every method, and throws `AppError` on an absent body.
4. **Service, module, tokens, `ConsumerApp` getter.**
5. **Query hooks** in `src/react/<module>.queries.ts`:
   - A **key factory with one function per level**
     (`all → lists() → list(filters) → details() → detail(id)`). Filters are
     appended only when set, so `list()` stays a prefix of every narrowed
     list.
   - `skipToken` for a missing input, never `enabled` beside a `queryFn`.
   - Mutation options typed `HookMutationOptions`.
   - Every cache update goes through `withCacheOnSuccess`. Write the row the
     server returned with `setQueryData` when you have it, and invalidate by
     the narrowest prefix that covers what changed. Never call a bare
     `invalidateQueries()`.
   - Biome plugins (`biome-plugins/*.grit`) enforce the key, `skipToken` and
     `onSuccess` rules.
6. If the data must never reach storage (credentials, personal data), add
   `thingsKeys.all[0]` to the product's non-persisted list.
7. Unit-test the entity getters and the key factory (`__tests__/`).

A flow that chains several calls (register, then sign in, then accept) is a
hook in the product package, not a `useMutation` written in a screen.
Screens call hooks; they don't orchestrate the API.

## 3. Write the render plan

This step is where most features go wrong, and the one most agents skip. List
every read and write the feature makes, and for each one the **lowest
component that draws the result**. That component is the one that calls the
hook.

| # | Hook | Drawn by | Updates on | Allowed when | Notes |
| --- | --- | --- | --- | --- | --- |
| R1 | `useThings()` | `sections/thing-table.tsx` | refetch, a create, a revoke | `read Thing` | the create card must not re-render on it |
| R2 | `useThingCatalog()` | `sections/create-thing-card.tsx` | once | — | the table does not need it |
| W1 | `useCreateThing()` | `sections/create-thing-card.tsx` | submit | `create Thing` | the form below takes `onSubmit`, `isPending` and `error` |
| W2 | `useRevokeThing()` | `dialogs/revoke-thing.tsx` | confirm | `delete Thing`, row still active | the table owns *which* row, since the row menu unmounts |
| S1 | search, page | `useTableQuery` in the table section | typing (debounced in the field) | — | lives in the URL |

"Allowed when" is the endpoint's `@CheckPolicies` rule plus any business rule
from step 1.

- **Actions:** each action is offered only when `useAbility()` grants that
  rule, and never offered where a business rule makes it a certain refusal.
  Hide a row action or a button rather than letting it end in a 403.
- **Nav rows:** a nav row for the screen takes `policies` from
  `ENDPOINT_POLICIES[...]`.
- **States:** every read renders four states:
  - loading: `Skeleton`, or `DataTable`'s `isLoading`;
  - empty: `EmptyState`, or `emptyLabel`;
  - **failed:** an `Alert` with the `useErrorMessage()` sentence and a retry
    where one helps. Never the empty state: "no members yet" after a failed
    request tells the reader something false. `DataTable` has no error state,
    so when the read failed and nothing is cached, render the `Alert`
    *instead of* the table, not above an empty one;
  - loaded.

Then check the plan against the render rules:

- **Only one reader?** That reader calls the hook, and the screen above it
  doesn't. A screen that subscribes only to hand the result to one child
  fails `pnpm check:structure`, and so does a route.
- **Two siblings share one result?** Fetching once above them is fine. Say
  so in a comment (see `features/profile/screens/profile.tsx`).
- **Forwarded props:** a `sections/` or `dialogs/` file that hands a data
  prop straight on without reading it fails `check:structure`.
- **Clocks:** a keystroke, a page change, a timer and a refetch each update
  something different. A component that holds two of them is two components.
- **Live input values** never reach a component that maps over rows. The
  field keeps the half-typed value and hands up the settled one.
- **State lives in the lowest component that reads it.** The exception: a
  dialog opened from a `rowActions` menu keeps its open state in the table.
- **Subscribe at the leaf:** `useWatch`, `useController` and `useFormState`
  go in the component that shows the value, never at form or page level.
  A preview, a checklist or a counter takes `control`.

## 4. Place each piece

| Piece | Directory | May fetch or use the router |
| --- | --- | --- |
| Page body a route mounts | `screens/` | yes |
| A pane, a table, a card group | `sections/` | yes |
| A dialog (one per file); it owns its mutation | `dialogs/` | yes |
| A form: props in, `onSubmit` out | `forms/` | **no** |
| Entity UI: row, cell, pill, hero, preview | `components/` | **no** |
| `use-*.ts`, the only place an effect may live | `hooks/` | yes |
| Types, mappers, constants; no JSX | `lib/` | — |

- **The route file composes:** its `Route`, `validateSearch`, `beforeLoad`
  and a component that renders one screen. Keep it under 120 lines, with no
  query in it that a screen or section could own.
- **Guards:** use the kit's `redirectSignedOut` / `redirectSignedIn`, not a
  hand-written `redirect`.
- **Sharing:** features never import each other. What a second feature needs
  moves to the platform kit (`packages/frontend/web` or `/mobile`, under a
  concern) when the second consumer appears. Platform-free logic (formatting,
  slugs, permissions) goes to core or the product package, never the kit.
- **Layout:** no sub-directories inside a kind, no `index.ts` in a feature,
  one component per file, kebab-case names without a kind suffix.

For the shapes that recur (a list with row actions, a create card, an edit
dialog, a settings pane, a detail screen, a gated screen, the mobile
equivalents), read the matching entry in `references/patterns.md`.

## 5. Write the code

Run the generator only for a **new** feature:

```bash
node scripts/scaffold-feature.mjs --app <app> --module <module> [--screen <name>]
```

It creates the kind directories and a screen that composes one section, so
the query starts one level down. Delete each `.gitkeep` once its kind has a
file. Then write the pieces from your plan, following `references/templates.md`:

- **Design system and kit first.**
  - Web: `PageHead`, `SectionHead`, `GroupHeading`, `SectionCard`,
    `DataTable`, `useTableQuery`, `paginateRows`, `ConfirmDialog`,
    `EmptyState`, `Skeleton`, `Alert`, `Badge` (with the lifecycle variants
    `active`, `paused`, `ended`, `draft`), `toast`, `FieldDescription`.
  - Mobile: `AuthLayout`, `FormField`, `ScreenErrorFallback`.
  - Read `packages/frontend/design-system/web/src/index.ts` and
    `packages/frontend/web/src/index.ts` before writing markup.
- **Colour:** only `text-ink-900/600/400`, `bg-surface-*`,
  `border-border-*`, `status-*` and `accent-*`. No shadcn aliases
  (`text-muted-foreground`, `bg-background`), no stock Tailwind colours, no
  `dark:` overrides, and no class the theme doesn't declare. Check a token
  exists in `globals.css` before using it.
- **Forms:**
  - Web: `useForm` with `useZodResolver(schema)`, the schema from
    `@flama/shared/schemas/<area>` (never the package root in `apps/web`),
    `noValidate`, `Field` with `FieldLabel`, `FieldDescription` and
    `FieldError`.
  - Mobile: a `Controller` per field, wired to `FormField`, with
    `field.onBlur` passed through.
  - An edit form takes `values` so it resets on new data, with no effect.
  - The form never applies its own side effects (theme, language,
    navigation); whatever owns the mutation does that on success.
- **Feedback:**
  - Success is a `toast`, never an inline "saved" row.
  - A failure the reader must act on is an `Alert` in the form or dialog,
    with the message from `useErrorMessage()`. Never show a raw
    `error.message`.
- **Asking first:** anything destructive or irreversible (revoke, delete,
  sign out a device) goes through `ConfirmDialog`.
- **Text:** every string the reader sees goes through `t()`, including
  `aria-label`s, loading text, fallbacks like "An application", and CSV
  headers.
  - Keys live in `packages/translations/{en,es}/<area>.json`.
  - Then run `pnpm --filter @flama/translations assemble`.
  - Delete the keys you stop using.
- **Labels drawn from data** (a role name, a status) are translated for
  display, but anything keyed on the value, such as a colour or an icon,
  still reads the raw value. `RolePill` takes the translated text as `label`
  and the stored role as `role`.
- **Dates and numbers:** `useLocale()` plus the formatters
  (`formatMediumDate`, `formatDateTime`, `formatRelativeTime`) from the kit
  or `@flama/frontend-core/format`. Never `toLocaleDateString(undefined)`,
  and never read `i18n.language` directly.
- **Effects and memo:**
  - An effect goes in `hooks/`, with a one-line comment naming the external
    system it syncs with.
  - No `useMemo`, `useCallback` or `memo` outside `hooks/`; the React
    Compiler is on.
- **Data:**
  - Never ship a placeholder number or fake row. If the value isn't
    available, render nothing.
  - A new third-party origin goes in `CSP_EXTRA_ORIGINS`.
  - An HTTP call goes through the product package, never a `fetch` in a
    screen. A raw `fetch` also ignores `VITE_API_URL`.

## 6. Review against the rules

Go through the "Patterns agents get wrong" list at the end of
`frontend-architecture.md` item by item. Then read the feature as the person
who will change it next:

- Which update redraws the most? Type into the search, settle a refetch,
  tick a row. Does anything outside the component that changed re-render?
- Does any component take a value it only hands on?
- Is there any string, date or number that is not translated or formatted
  with the locale?
- Is there a helper that already exists in the kit, core, or another
  feature? Promote it or import it; never write it a second time.
- Does every destructive action ask first, and does every failure say
  something the reader can act on?
- Does every success have exactly one confirmation?

Fix what this finds before presenting.

## 7. Prove it

Run the checks for the app you touched:

```bash
node .agents/skills/scaffold-feature/scripts/verify-feature.mjs --app <app> [--module <module>] [--base <ref>]
```

It runs the checks a contributor runs, in order, and stops at the first
failure:

- `pnpm check:structure` (placement, the render-topology checks and their
  tests)
- dependency-cruiser for the app and every frontend package you changed
- Biome (the query-key, `skipToken` and mutation plugins included)
- the typecheck (web)
- the unit tests of the feature and of the changed packages

For mobile, where the native dependencies may not install, it says which
checks it skipped.

Beyond that:

- **A component whose cost is the point** (a table, a picker, anything
  typed into) gets a `*-render.spec.tsx` asserting what one interaction
  renders. It runs in the `render-budget` project with the compiler off; see
  `data-table-render.spec.tsx` in the web kit.
- **A web screen wired to the API** needs an e2e spec in `e2e/tests/web/`
  (`references/templates.md` §9). If an existing spec drives UI you changed
  (labels, headings, URLs), update it in the same change.

If a check cannot run here, say so and name it. Never claim a check passed
when it didn't run.

## 8. Present the feature

When the task was a **review or a fix**, lead with the findings. List each
one with the rule it broke, where it was, and what you changed; say which
you left alone and why.

End with a short summary:

- The files, grouped by kind, and the module they render.
- The render plan table, with where each hook ended up and what gates each
  action.
- The checks and their results, and every check that did not run with the
  reason, the e2e spec included (it needs the API and a database).
- Decisions worth a second look (what a confirm guards, what is not
  persisted, what was assumed in step 1).
- Follow-ups outside this change: an endpoint still missing, a
  `generate:api-client`, a helper worth promoting once a second consumer
  appears.
