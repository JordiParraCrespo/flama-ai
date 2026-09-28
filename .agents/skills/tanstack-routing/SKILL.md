---
name: tanstack-routing
description: Routing in the web app (apps/web), which uses TanStack Router with file-based routing. Use this whenever you add, move, rename, split or delete a route file, touch routeTree.gen.ts or tsr.config.json, or debug a route that renders the wrong layout or a URL that changed when it should not have. Not for apps/mobile, which routes with expo-router.
---

# Routing in the web app

`apps/web` (and `apps/admin-web`, with that plugin) is a TanStack Router SPA
with file-based routing: the files under `src/routes/` are the route tree, and
`src/routeTree.gen.ts` is generated from them. A file's name decides two
things at once, its **URL** and the **layout chain** that renders it, so a
rename is a URL change. URLs live in bookmarks, e2e specs, the API's email
links and every `Link`. Know what each file produces before you move one, and
prove afterwards that the set of URLs is the one you meant.

The invariants (where a guard goes, what `validateSearch` returns, why no
route has a `loader`) are the routing section of
`.agents/rules/frontend-architecture.md`. This skill is the two things that
rule does not hold: the table and the check.

## File name → URL

| File | URL | What the name does |
|---|---|---|
| `__root.tsx` | — | Always matched, wraps the tree. |
| `about.tsx` | `/about` | Plain segment. |
| `settings.security.tsx` | `/settings/security` | `.` is a flat spelling of `settings/security.tsx`. |
| `settings/index.tsx` | `/settings` | Matches the parent exactly; its id ends in `/`. |
| `settings/route.tsx` | `/settings` | Directory spelling of the route at that path (its layout). |
| `tokens/$tokenId.tsx` | `/tokens/$tokenId` | `$param`: `Link to="/tokens/$tokenId" params={{ tokenId }}`. |
| `files/$.tsx` | `/files/*` | Splat, in `params._splat`. |
| `_auth.tsx` | — | `_` prefix: **pathless layout**. A component, a guard, or both; no segment. |
| `_auth/_public/login.tsx` | `/login` | Renders `__root → _auth → _public → login`; only `login` has a path. |
| `_auth/onboarding.tsx` | `/onboarding` | Not pathless: read the prefix, not the nesting. |
| `posts_.$id.edit.tsx` | `/posts/$id/edit` | `_` suffix: keeps the URL, escapes the parent's layout. |
| `(marketing)/pricing.tsx` | `/pricing` | Grouping folder: no segment, no component, no behaviour. |
| `-helpers.ts` | — | Excluded from the tree (helpers go in a feature's `lib/` here). |
| `script[.]js.tsx` | `/script.js` | `[x]` escapes a character the conventions would claim. |

A pathless layout and a grouping folder both keep a segment out of the URL.
Only the layout can render chrome or carry `beforeLoad`, `validateSearch` or
`staticData`; if a grouping folder needs behaviour, it wanted to be a pathless
layout. A pathless layout with no `component` renders `<Outlet />`, which is
how `_public.tsx` exists only to hold a guard.

## Check that a restructure kept the URLs

```bash
urls() { sed -n '/interface FileRoutesByTo/,/^}/p' apps/web/src/routeTree.gen.ts; }
urls > /tmp/urls.before                  # before the move
pnpm --filter @flama/web routes          # after it: regenerate the tree, no build
urls | diff /tmp/urls.before -
```

`FileRoutesByTo` is the set of paths `Link` and `navigate` accept: it must
change only where you meant it to. `FileRoutesById` carries the pathless
segments (`/_auth/_public/login`), which is what to read when a route renders
under the wrong layout. For every URL you did change, grep `e2e/tests/web/`,
`src/lib/nav.ts`, the `redirect`/`Link` call sites, the kit's guards and the
API's email links (`apps/api`).

Then the usual checks: `pnpm turbo run build --filter=@flama/web` (routes,
`tsc -b`, Vite), `pnpm arch`, `pnpm check:structure`, `pnpm check:bundle`, and
`pnpm starter:check` when the route belongs to an optional feature.
