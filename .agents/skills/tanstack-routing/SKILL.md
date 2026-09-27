---
name: tanstack-routing
description: Routing in the web app (apps/web), which uses TanStack Router with file-based routing. Use this whenever you add, move, rename, split or delete a route file; add or change a route guard, redirect, layout route or search param; touch routeTree.gen.ts, tsr.config.json, beforeLoad, validateSearch, staticData or the router context; or debug a 404, a redirect loop, a route that renders the wrong layout, or a URL that changed when it should not have. Also use it when the user asks about the route tree, URL structure, protected or authenticated routes, sign-in redirects, or where a screen should live — even if they never say "router". Not for apps/mobile, which routes with expo-router.
---

# Routing in the web app

`apps/web` is a TanStack Router SPA with file-based routing: the files under
`src/routes/` *are* the route tree, and `src/routeTree.gen.ts` is generated
from them. The same holds for `apps/admin-web` when the `admin-web` plugin is
installed; read "the app" below as whichever one you are in. `apps/mobile`
routes with expo-router (`apps/mobile/app/`), which has conventions of its own
and is not covered here.

The single most expensive mistake in this area is changing a URL by accident.
File-based routing means a rename is a URL change, and URLs are in bookmarks,
in e2e specs, in emails the API sends (invitation and password-reset links)
and in `Link`s across the app. Before you move any route file, know what URL
each file produces — and afterwards, prove the set of URLs is what you
intended by reading `FileRoutesByTo` in the regenerated tree.

## Where things are

```
apps/web/
├── tsr.config.json     the generator's options, read by the Vite plugin and by `pnpm routes`
├── scripts/generate-routes.mjs   `pnpm --filter @flama/web routes`: the tree, without a build
└── src/
    ├── app.tsx             createRouter, the RouterContext type, the auth subscription
    ├── routeTree.gen.ts    GENERATED — never edit by hand
    ├── lib/nav.ts          the sidebar and user-menu destinations (typed, so a dead URL fails the build)
    └── routes/
        ├── __root.tsx      NuqsAdapter + PageViewTracker, no guard
        ├── index.tsx       /  → redirects to /dashboard or /login
        ├── _auth.tsx       AuthLayout (the split screen), no guard
        ├── _auth/
        │   ├── _public.tsx          guard: signed-in → ?redirect or /dashboard; no component
        │   ├── _public/             login · register · forgot-password · reset-password
        │   ├── accept-invitation.tsx   no guard: either reader belongs   (organizations)
        │   └── onboarding.tsx          guard: signed-out → /login        (organizations)
        ├── _authenticated.tsx  guard: signed-out → /login; AppShell behind its gates
        ├── _authenticated/     dashboard · profile · settings/ (index, api-tokens)
        └── about · privacy · terms   (public, no layout)
```

`(organizations)` marks what the optional `organizations` feature owns. Those
route files are listed in its `paths` in `scripts/starter/features.json`, and
the lines other routes spend on it (the `WorkspaceGate` in `_authenticated.tsx`,
the General pane in `settings/index.tsx`, the organizations field on
`settings/api-tokens.tsx`) sit inside `flama:begin organizations` fences. A
route you add for an optional feature goes the same way: its file in that
feature's `paths`, every line elsewhere fenced — `pnpm starter:check` fails
otherwise.

## The rules that catch most mistakes

**A route file composes; it does not contain.** It holds the `Route`
(`beforeLoad`, `validateSearch`, `staticData`, `component`) and a small
component that mounts a screen from `src/features/<module>/screens/` or
arranges sections. `pnpm check:structure` caps it at 120 lines, and
dependency-cruiser's `routes-compose` rule forbids importing a feature's
`forms/`, `components/` or `hooks/` — a route reaching into those is a screen
that has not been written yet.

**The layout route and the guard are different jobs.** A layout route exists to
render chrome; a guard exists to decide who may be here. Put the guard on the
narrowest route that owns that decision. When one layout serves subtrees with
different answers — `_auth` wraps the sign-in screens, which turn signed-in
visitors away, onboarding, which turns signed-out ones away, and the
invitation screen, which takes either — the layout carries no guard and each
subtree carries its own (`_public` is a pathless child that exists only for
its guard). Stacking opposite guards on the shared parent is how you get a
redirect loop, and `_auth.tsx`'s comment says which hand-off it would break.

**Use the kit's guards.** `redirectSignedIn` and `redirectSignedOut` from
`@flama/frontend-web` are a pair: the second sends a signed-out reader to
`/login` with `location.href` (not `pathname`, or a deep link loses its search)
as `?redirect=`, and the first sends a signed-in reader on to that
`?redirect=`, sanitised, or to the `landing` you name. Writing either redirect
inline is how the login target and the sanitising drift apart. Any redirect
target that came from a URL goes through `sanitizeRedirect` — an absolute or
protocol-relative value is an open redirect.

**`validateSearch` replaces the route's search.** Whatever it returns *is* the
search; a key it does not return is gone by the next navigation. A route that
only cares about one key must still spread the rest through, or it silently
deletes another component's state — a table's `tokens_page`, or whatever nuqs
wrote. `routes/_authenticated/settings/index.tsx` and `parseProfileSearch` in
`features/profile/lib/panes.ts` are the worked examples, and `__root.tsx`
explains why nuqs depends on it. The login route shows the other half: Better
Auth appends `?error=` on a failed social round-trip, and the route keeps it
only because its validator names it.

The wider TanStack advice is to write these as Zod schemas with defaults, which
buys real type safety. Weigh it here against the bundle: `validateSearch` is
critical-path code that `autoCodeSplitting` will not split out, and `apps/web`
must not pull runtime values from the `@flama/shared` root. A narrow schema
from a subpath is fine; a hand-rolled validator, as the routes use today, is
also fine. `pnpm check:bundle` is the arbiter.

**`to` is a pathname, never a URL with a query.** `to: '/settings?section=security'`
puts the whole string in the pathname and 404s. Split it and pass `search`
separately — `features/auth/screens/login.tsx` does this when sending a reader
on after sign-in.

**`routeTree.gen.ts` is generated.** Never hand-edit it, and never leave it
stale. The app's `build` is `pnpm run routes && tsc -b && vite build`, so a
build regenerates it before the typecheck reads it; `dev` regenerates it on
save through the Vite plugin. To see it in seconds without a build, run
`pnpm --filter @flama/web routes`. Both read `tsr.config.json`, so they cannot
disagree. Commit the regenerated file with the routes that changed it.

## File name → URL

| File | URL | Notes |
|---|---|---|
| `__root.tsx` | — | always matched, wraps everything |
| `about.tsx` | `/about` | |
| `settings/index.tsx` | `/settings` | matches the parent exactly |
| `settings/api-tokens.tsx` | `/settings/api-tokens` | |
| `tokens/$tokenId.tsx` | `/tokens/$tokenId` | `$` is a param; `Link to="/tokens/$tokenId" params={{ tokenId }}` |
| `_auth.tsx` + `_auth/_public/login.tsx` | `/login` | `_` prefix: **pathless layout**, wraps without a URL segment |
| `_auth/onboarding.tsx` | `/onboarding` | not pathless: contributes its segment under a pathless parent |
| `posts_.$id.edit.tsx` | `/posts/$id/edit` | `_` **suffix**: un-nests from the parent's layout |
| `(marketing)/pricing.tsx` | `/pricing` | parens: grouping folder, no URL segment |
| `-helpers.ts` | — | `-` prefix: excluded from the tree entirely |

Nesting composes both ways: `_auth/_public/login.tsx` renders
`__root → _auth → _public → login` while its URL is only `/login`, because
both `_` segments contribute a component (or a guard) and no path. That is the
tool for "same chrome, different URLs" — reach for it before duplicating a
layout.

`references/file-conventions.md` has the full table, the escaping rules and
a worked example of a move that keeps URLs stable.

## Guards and the auth context

Guards read `context.auth.isAuthenticated` in `beforeLoad` and throw a
`redirect`. Three facts about this app make them behave:

1. **`beforeLoad` runs parent-first, and only when the router re-runs it.** It
   is not a subscription. `app.tsx` subscribes to the auth store at module
   scope, hands the router the new context *before* calling
   `router.invalidate()`, and skips invalidation while the router is unmounted
   — read the comment there before changing any of it.
2. **Session restore gates the router, not the guards.** A returning reader's
   token is in localStorage, so `SessionGate`
   (`features/auth/sections/session-gate.tsx`) holds the `RouterProvider` behind
   `useSessionRestore()`'s `isPending`. Without that gate every signed-in cold
   load bounces to `/login` and back.
3. **A guard is chrome, not authorization.** The API authorizes every request
   independently. A route guard only saves the reader from a screen that would
   refuse them. Whether a nav row shows is `policies` in `lib/nav.ts`, taken
   from `ENDPOINT_POLICIES` (`.agents/rules/frontend-ui.md`), not a guard.

What stands between a signed-in reader and the shell beyond the guard is a
gate, not a route: `_authenticated.tsx` opens `AppShell` through `GATES`, and
with organizations `WorkspaceGate` holds it until the reader has a workspace
(sending one with none to `/onboarding`). A new precondition for the whole
console is another gate in that list, not a second guard.

## Configuring a layout from its pages

When a layout needs to vary per page, the page declares route `staticData` and
the layout reads it off the innermost match — the page overrides its layout
without reaching up into it. `AuthLayout` in the kit does this for
`legalNoteKey` (the forgot- and reset-password pages declare one), with the
`declare module` block that augments `StaticDataRouteOption` in
`auth/lib/legal-note.ts`, beside its only reader. Adding a key means adding it
next to its reader, not to a shared types file.

Three things to get right when you add one:

- **Read one walk, not one per key.** A single `useMatches` whose `select`
  returns the whole framing object beats a subscription per key. It is also
  the only shape that typechecks cleanly: a helper generic over the staticData
  key cannot be resolved by the router, so its selector's return type widens to
  include the match array.
- **Test "declared", not "truthy", once a falsy value means something.**
  `'key' in staticData`, or `!== undefined`. `legalNoteKey` tests truthiness
  today, which is right only while no page needs to say "no line here".
- **Give a key its own states rather than adding a flag beside it.** "No line"
  is `null` on the same key, not a second boolean that exists only to be
  `false` and a branch in the layout to match.

## Code splitting, preloading, and the loader decision

`autoCodeSplitting` is on (`tsr.config.json`), so each route's `component`,
`errorComponent` and `pendingComponent` are their own chunk while
`beforeLoad`, `validateSearch`, `staticData` and `loader` stay in the critical
bundle. That is why guards cost nothing and why a fat route file costs
everyone. The critical path is budgeted — `pnpm check:bundle` is where a heavy
import shows up.

`defaultPreload: 'intent'` fetches a route's chunk on hover or focus. Because
no route here carries a `loader`, that prefetches code only.

**No route has a `loader`, deliberately.** Every screen reads through TanStack
Query, and `defaultPreloadStaleTime: 0` hands freshness entirely to it rather
than running a second, disagreeing staleness rule. Know that this is a real
trade, not an oversight: upstream guidance is to preload a screen's critical
data in the loader with `queryClient.ensureQueryData` so navigation lands on
data instead of a spinner, and this app accepts the spinner to keep one cache
and one rule. If you add the first `loader`, that is an architectural change,
not a route change — put the `queryClient` on the router context, say why the
router should own that data, and revisit `defaultPreloadStaleTime` in the same
diff.

## What this app does not have yet

Worth knowing before you assume a mechanism exists, and worth proposing rather
than quietly adding, since each is app-wide:

- **No `errorComponent` or `notFoundComponent`** on any route, and no
  catch-all (`$.tsx`). An unknown URL or a thrown render falls to TanStack
  Router's defaults. Adding them is one pair on `__root.tsx` for URLs outside
  any layout and one on `_authenticated.tsx`, so a 404 inside the console keeps
  the shell around it; `notFoundMode` defaults to `fuzzy`, which renders the
  404 at the closest match that has a boundary. Then "this id does not exist"
  is `throw notFound()` from the route's `beforeLoad` or loader.
- **No `useBlocker`.** That is the tool for a form with unsaved changes, and
  it drives the browser's own `beforeunload` too.
- **No scroll restoration** configured.

## Verify before you push

```bash
pnpm --filter @flama/web routes                  # regenerate the tree
pnpm turbo run build --filter=@flama/web         # routes + tsc -b + vite; the real check
pnpm turbo run arch --filter=@flama/web          # routes-compose and friends
pnpm check:structure                             # the 120-line route cap
pnpm check:bundle                                # needs a build of apps/web
pnpm starter:check                               # if a route belongs to an optional feature
```

If you moved or renamed anything, also diff the URL surface — this is the check
that catches an accidental URL change, and nothing else does:

```bash
sed -n '/interface FileRoutesByTo/,/^}/p' apps/web/src/routeTree.gen.ts
```

Then grep the repo for the URLs you touched: `e2e/tests/web/` asserts on them,
and so do `Link`/`Navigate`/`redirect` call sites, `src/lib/nav.ts`, the kit
(`redirectSignedOut`'s `/login`), and the API's email links
(`apps/api`, e.g. the invitation URL).

## Recipes

`references/recipes.md` walks through the moves that come up: adding a route,
adding a guarded subtree under an existing layout, restructuring without
changing URLs, adding a search param that survives other routes, sending a
reader on after sign-in, blocking navigation away from an unsaved form, and a
route that answers "this does not exist".
