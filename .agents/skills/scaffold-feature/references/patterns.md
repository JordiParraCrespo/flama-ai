# Recurring feature shapes

Each entry has the files the shape takes and the one mistake it most often
invites. Paths are relative to `apps/web/src/features/<module>/` unless they
say otherwise. Read the entries your feature uses.

## Contents

1. A list with row actions (table, paging, search, a destructive action)
2. A create card beside the list
3. An edit dialog over one row
4. A settings pane inside a cross-module page
5. A detail screen for one record
6. A screen gated on state (onboarding, a missing organization)
7. A form with a live preview or checklist
8. A multi-call flow (sign up, then join)
9. A picker over a list the workspace grows
10. Mobile equivalents
11. A pane that links elsewhere instead of duplicating a screen

---

## 1. A list with row actions

```
sections/thing-table.tsx     useThings() + useTableQuery({ prefix }) + DataTable
dialogs/revoke-thing.tsx     useRevokeThing() + ConfirmDialog; props: { thing, onClose }
components/thing-status-badge.tsx   Badge with the lifecycle variant
lib/thing-status.ts          status → variant/label maps, page size
```

- The table section calls the list hook. The screen above it doesn't.
- Search, filters, sort and page live in the URL through
  `useTableQuery({ prefix: 'things' })`. The field (`DataTableSearch`) keeps
  the half-typed word; the table only sees the settled `search`.
- A search is the server's job: pass `search` into the hook's params, so it
  lands in `thingsKeys.list(filters)`. `paginateRows` only slices a list the
  server hands over whole.
- `rowActions={(row) => …}` returns `DropdownMenuItem`s, or `null` when the
  row has nothing left to do (a revoked token).
- A destructive item only records *which* row: `setRevoking(row)`. The table
  renders `{revoking && <RevokeThingDialog thing={revoking} onClose={() => setRevoking(null)} />}`.
  The dialog owns the mutation (`useRevokeThing({ onSuccess: onClose })`) and
  shows `revoke.error` through `ConfirmDialog`'s `error`. The open state
  can't live in the dialog, because the row menu unmounts when it closes.
- Empty: `DataTable`'s `emptyLabel` and `emptyIcon`. Loading: its
  `isLoading`. Don't render a paragraph for either.
- Lifecycle column: `Badge variant="active" | "paused" | "ended" | "draft"`,
  never `destructive` or `secondary`.

**Common mistake:** revoking straight from the menu item, with one
`isPending` that disables every row.

## 2. A create card beside the list

```
sections/create-thing-card.tsx   useCreateThing(), useThingCatalog() if the form needs options
forms/create-thing-form.tsx      RHF + useZodResolver; props: { onSubmit, isPending, error, …options }
components/secret-panel.tsx      a one-time value shown after success (if any)
```

- The card owns the mutation and reads the catalog **only if the card draws
  it**. When only the form needs the options, the card reads them to pass
  down; that is fine, because a form can't fetch. What fails the check is a
  screen fetching for the card.
- The form resets itself after success: `onSubmit` returns, and the card
  calls `form.reset()` through a `key` bump or the `values` option. No
  effect.
- Success: `toast.success(t('things.created'))`, or a panel for a one-time
  secret. Not both.

**Common mistake:** the screen calls `useThingCatalog()` and threads it
through the card into the form.

## 3. An edit dialog over one row

```
dialogs/edit-thing.tsx    useUpdateThing({ onSuccess: onClose }); renders the form
forms/thing-form.tsx      useForm({ values: toFormValues(thing), resolver: useZodResolver(updateThingSchema) })
```

- `values`, not `defaultValues` plus an effect, so the form follows the
  record it is given.
- The dialog writes the updated row into the cache in the hook
  (`setQueryData(thingsKeys.detail(id), updated)`) and invalidates
  `thingsKeys.lists()`.
- A long dialog puts its middle in `DialogBody`.

## 4. A settings pane inside a cross-module page

`/settings` composes panes from several modules (`general` from
organizations, `security` from profile, `api` from api-tokens). The route or
its screen renders the sub-nav and picks the pane from `?section=`.

- Each pane is a `sections/` file in **its own module's** feature and calls
  its own hooks. The page doesn't subscribe for a pane. If the page heading
  needs the same data (an organization's name), the page reads it for the
  heading and the pane reads it again: TanStack dedupes the request, and each
  reader re-renders on its own.
- The pane key lives in the URL (`validateSearch`), and unknown search keys
  are carried through so a table inside the pane keeps its `?page=`.
- The sub-nav is the kit's (`SectionNav`), not markup copied per page.

**Common mistake:** `const organizations = useOrganizations()` in the route,
only to pass `organization` and `loading` to the general pane.

## 5. A detail screen for one record

```
screens/thing.tsx            composes; takes the id from the route
sections/thing-overview.tsx  useThing(id)
sections/thing-activity.tsx  useThingActivity(id), paged in the URL
components/thing-hero.tsx    props only
```

- The query hook gates on the id with `skipToken`:
  `queryFn: id ? () => app.things.findOne(id) : skipToken`, with
  `queryKey: thingsKeys.detail(id)`.
- A 404 is a state the screen renders (an `EmptyState` with a way back), not
  a thrown error.

## 6. A screen gated on state

An account with no organization goes to `/onboarding` (web: the
`_authenticated` layout; mobile: the `(app)` layout).

- Redirect only on a **settled, successful, empty** answer:
  `isSuccess && !isFetching && data.length === 0`. While a refetch is in
  flight, or after a failure, render as usual. Otherwise a network blip
  bounces every reader out.
- The target screen redirects back when the condition no longer holds (the
  reader typed the URL, or finished in another tab).
- Both platforms ship the gate. A web-only gate leaves mobile readers on
  screens that answer 403.

## 7. A form with a live preview or checklist

- The preview or checklist is a `components/` file that takes `control` and
  calls `useWatch({ control, name })` itself. The form never calls
  `watch()` for it.
- A checklist two features use (password rules) lives in the kit's `auth`
  concern.

**Common mistake:** `const [name, logo] = watch(['name', 'logo'])` at the top
of the form. That re-renders every field on every keystroke.

## 8. A multi-call flow

Register, then sign in, then accept an invitation. Or upload, then attach.

- The chain is **one hook in the product package**
  (`useAcceptInvitationAsNewcomer`). Each step calls the service, and the
  hook's `withCacheOnSuccess` update invalidates exactly what the chain
  changed.
- The screen calls `mutate(values)` and renders `error` through
  `useErrorMessage()`.

**Common mistake:** a `useMutation({ mutationFn: async () => { await a(); await b(); } })`
in the screen, ending in a bare `invalidateQueries()`.

## 9. A picker over a list the workspace grows

It is an autocomplete: `Combobox` in a `Controller`, with `onQueryChange`
pointed at the query that fetches the options. Use `Select` only for a fixed,
short list known at build time.

## 10. Mobile equivalents

| Web | Mobile |
| --- | --- |
| `register()` | a `Controller` per field + `FormField`, passing `field.onBlur` |
| `PageHead` | the Stack header title (`t()`), or `AuthTitle` in auth-style screens |
| `DataTable` | `LegendList` (design system) in a section; `EmptyState` and `Skeleton` for the empty and loading states |
| `ConfirmDialog` | the design system's `AlertDialog` (`@flama/design-system-mobile/alert-dialog`) |
| `toast` | the design system's `toast` (`@flama/design-system-mobile/toast`) |
| router `redirect` in `beforeLoad` | `<Redirect href=… />` in the group layout, or `Stack.Protected` |

- Colours: the same ink and surface tokens (`text-ink-900`, `text-ink-600`).
  React Navigation takes plain values: read them from the kit's `THEME`,
  never from hand-written HSL.
- Never override the palette with `vars()` on a root view. `global.css`
  already defines light and dark.

## 11. A pane that links elsewhere instead of duplicating a screen

When one screen owns a resource (API tokens) and another page wants a pane
for it (settings), the pane is a card with a link. It isn't a second
implementation. Two copies drift, and a fix only ever lands in one of them.
