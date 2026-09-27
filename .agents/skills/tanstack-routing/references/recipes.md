# Recipes

## Add a route

1. Decide the URL first, then name the file backwards from it
   (`references/file-conventions.md`). Decide which layout should wrap it —
   that decides which directory it goes in, and it is the part people get
   wrong: a console page goes under `_authenticated/`, a sign-in-adjacent page
   under `_auth/` (and under `_auth/_public/` if a signed-in reader should be
   sent away), a public page with no chrome at the root.
2. Write the route file: the `Route`, and a component that mounts a screen.
   The screen goes in `src/features/<module>/screens/`; `/scaffold-feature`
   builds that shape.
3. Regenerate and build:

```bash
pnpm --filter @flama/web routes
pnpm turbo run build --filter=@flama/web
```

4. If the route should appear in navigation, add it to `src/lib/nav.ts` (typed
   `NavItem`, so a URL that does not exist fails the build). A row that needs a
   permission takes its `policies` from `ENDPOINT_POLICIES`, keyed by the
   endpoint the screen reads.
5. A screen wired to the API gets a spec in `e2e/tests/web/`.
6. If the route belongs to an optional feature (today, `organizations`), add
   its file to that feature's `paths` in `scripts/starter/features.json` and
   fence every line elsewhere that names it, then run `pnpm starter:check`.

## Add a guarded subtree under an existing layout

The case the auth tree solves: a layout already renders the chrome you want,
but your routes need a different guard from its existing children.

Do **not** add a second condition to the parent's `beforeLoad`. Add a pathless
child that carries only the new guard, and move the existing children under a
sibling pathless child carrying theirs:

```tsx
// routes/_auth/_public.tsx — no component; it defaults to <Outlet />
export const Route = createFileRoute('/_auth/_public')({
  beforeLoad: ({ context, location }) =>
    redirectSignedIn({ context, location, landing: '/dashboard' }),
});
```

Both subtrees keep the parent's component and their URLs are untouched, because
a `_`-prefixed segment contributes no path.

## Restructure without changing URLs

1. `git mv` the files. Use `git mv` so the rename is visible in review rather
   than a delete plus an add.
2. Check the string inside each `createFileRoute('...')` against its new
   path after regenerating: a mismatch shows up as a confusing type error
   rather than a clear one.
3. Regenerate the tree (`pnpm --filter @flama/web routes`).
4. Diff the URL surface — this is the step that proves the restructure was
   behaviour-preserving:

```bash
urls() { sed -n '/interface FileRoutesByTo/,/^}/p' "$1"; }
git show HEAD:apps/web/src/routeTree.gen.ts > /tmp/tree-before.ts
diff <(urls /tmp/tree-before.ts) <(urls apps/web/src/routeTree.gen.ts)
```

(Reading the old tree out of `HEAD` rather than stashing: a stash during a
half-finished move is a good way to lose the move.)

Expect the route *types* on the right-hand side to change (they are named after
the files) and the *keys* on the left to be identical. A changed key is a
changed URL.

5. Grep for what referenced the old paths: `e2e/tests/web/`, `src/lib/nav.ts`,
   any `Link`/`Navigate`/`redirect`, the app's `ARCHITECTURE.md`, and — if the
   file belongs to an optional feature — its `paths` in
   `scripts/starter/features.json`, which `pnpm starter:check` holds to the
   tree.

## A search param that other routes must not delete

`validateSearch` replaces the whole search, so a narrow validator deletes
everything it does not return. Spread the rest through:

```tsx
validateSearch: (search: Record<string, unknown>): Record<string, unknown> & { section?: SectionKey } => {
  const { section: requested, ...rest } = search;
  return PANES.includes(requested as SectionKey) ? { ...rest, section: requested as SectionKey } : rest;
},
```

This is what keeps nuqs working (`__root.tsx` mounts `NuqsAdapter` inside the
router for the same reason) and what keeps a table's page number
(`useTableQuery`'s `tokens_page`) alive while the reader switches settings
panes. When the parser is worth reusing or testing, it goes in the feature's
`lib/`, as `parseProfileSearch` does.

When you *want* the opposite — a clean slate — say so at the call site, as
`settings/index.tsx` does when changing pane: `navigate({ search: { section } })`
replaces rather than merges, so a table's state does not follow the reader into
a pane with no table.

## Send a reader on after sign-in

The target arrives in the URL, so it is attacker-controlled. Two rules:

```tsx
// 1. Sanitise. An absolute or protocol-relative value is an open redirect.
validateSearch: (search) => ({ redirect: sanitizeRedirect(search.redirect) }),

// 2. `to` is a pathname. A target may carry its own search, so split it.
const [pathname, query] = (redirectTo ?? '/dashboard').split('?');
navigate({ to: pathname, search: Object.fromEntries(new URLSearchParams(query ?? '')) });
```

Passing the whole string as `to` swallows everything after the `?` into the
pathname and 404s. `routes/_auth/_public/login.tsx` and
`features/auth/screens/login.tsx` are the reference. A guard that is already
signed in uses `redirectSignedIn`, which throws `redirect({ href })` with the
sanitised value and so needs no split.

For the reverse direction — a guard capturing where someone was going — send
`location.href`, not `location.pathname`, or a deep link loses its search
params on the way back. `redirectSignedOut` does.

## When the generator and the build disagree

`pnpm routes`, the Vite plugin and the build all read `tsr.config.json`, so
they should not disagree. If `dev` changes `routeTree.gen.ts` after
`pnpm routes` ran, an option has crept into `vite.config.ts`'s
`TanStackRouterVite()` call instead of the JSON file: move it to the JSON.

If the tree looks right but `tsc` fails on it, the mismatch is almost always a
`createFileRoute('...')` string that does not match the file's location.

## Block navigation away from an unsaved form

The app has no blocker yet. `useBlocker` is the router's own mechanism; do not
hand-roll one with a `beforeunload` listener, which cannot see in-app
navigation at all.

```tsx
const { proceed, reset, status } = useBlocker({
  shouldBlockFn: () => formState.isDirty,
  withResolver: true,   // you render the confirm dialog
  enableBeforeUnload: () => formState.isDirty,  // covers tab close and reload
});
```

Render a confirm `Dialog` from the design system on `status === 'blocked'`.
Put the hook in the feature's `hooks/`, not in the route file — a route
composes.

## Make a route answer "this does not exist"

No route declares a `notFoundComponent` yet, so add the boundaries first
(one on `__root.tsx`, one on `_authenticated.tsx` so the console keeps its
shell) — that is an app-wide change, propose it. Then a route with a bad id
does not add a screen; it throws:

```tsx
export const Route = createFileRoute('/_authenticated/tokens/$tokenId')({
  beforeLoad: ({ params }) => {
    if (!looksLikeId(params.tokenId)) throw notFound();
  },
});
```

`notFoundMode` is `fuzzy` by default, so this renders at the closest match
with a boundary — inside `AppShell`, with the sidebar still beside it, rather
than replacing the page.
