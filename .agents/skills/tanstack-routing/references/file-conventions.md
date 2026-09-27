# File names, URLs and the tree they build

The generator turns `src/routes/**` into `src/routeTree.gen.ts`, with the
options in `tsr.config.json`. Two things come out of a file's name: the
**URL** it matches and the **component chain** that renders it. They move
independently, which is the whole point — and the source of most confusion.

## Every token

| Token | Example file | URL | Effect |
|---|---|---|---|
| `__root.tsx` | `__root.tsx` | — | Always matched, always rendered, wraps the tree. Must sit at the root of `routes/`. |
| plain segment | `about.tsx` | `/about` | |
| `.` separator | `settings.api-tokens.tsx` | `/settings/api-tokens` | Flat spelling of a nested path; equivalent to `settings/api-tokens.tsx`. |
| `index` | `settings/index.tsx` | `/settings` | Matches the parent exactly, when no child matches. Its id ends in `/` (`/_authenticated/settings/`). |
| `$param` | `tokens/$tokenId.tsx` | `/tokens/$tokenId` | Captured into `params`. |
| `$` alone | `files/$.tsx` | `/files/*` | Splat; the rest lands in `params._splat`. |
| `_` **prefix** | `_auth.tsx` | — | **Pathless layout route.** Contributes a component (or only a guard), no URL segment. |
| `_` **suffix** | `posts_.$id.edit.tsx` | `/posts/$id/edit` | **Non-nested route.** Keeps the URL, escapes the parent's layout. |
| `(group)` | `(marketing)/pricing.tsx` | `/pricing` | Grouping folder. Organisation only — no segment, no component. |
| `-` prefix | `-helpers.ts` | — | Excluded from the tree. A colocated helper, not a route (in this app, helpers go in a feature's `lib/` instead). |
| `[x]` | `script[.]js.tsx` | `/script.js` | Escapes a character the conventions would otherwise claim. |
| `route.tsx` | `blog/post/route.tsx` | `/blog/post` | Directory-style spelling of the route at that path. |

## Layout file beside a layout directory

`settings.tsx` next to `settings/` would make the file the layout for
everything in the directory, and — having no `_` prefix — it would also be the
`/settings` segment its children hang from. This app has no such file today:
`settings/index.tsx` and `settings/api-tokens.tsx` both render straight into
`_authenticated`'s shell. Add one when the two pages start sharing chrome
(a sub-nav across both), not before.

`_auth/onboarding.tsx` shows the non-pathless shape one level down: it sits
under the pathless `_auth`, contributes the `/onboarding` segment, and carries
its own guard. Read the prefix, not the nesting.

## Pathless layout vs grouping folder

Both keep a segment out of the URL. They are not interchangeable:

- **Pathless layout (`_name.tsx`)** renders a component and can carry
  `beforeLoad`, `validateSearch` and `staticData`. Use it when the routes share
  chrome or a guard.
- **Grouping folder (`(name)/`)** renders nothing and carries nothing. Use it
  when you only want the files near each other.

If you find yourself giving a grouping folder behaviour, you wanted a pathless
layout.

## Worked example: the auth layout and its three answers

The shape `routes/_auth*` has now, and the naive shape it replaces. Every URL
is the same in both; only the component chain and the guards differ.

Naive — one guard on the layout, and a second copy of the layout for the
screens that want a different answer:

```
_auth.tsx                  guard: redirectSignedIn      →  AuthLayout
  _auth/login.tsx                                       →  /login
onboarding.tsx             guard: redirectSignedOut     →  AuthLayout (a second copy)
accept-invitation.tsx      no guard                     →  AuthLayout (a third copy)
```

Now:

```
_auth.tsx                  no guard                     →  AuthLayout
  _auth/_public.tsx        guard: redirectSignedIn      →  (no component)
    _auth/_public/login.tsx                             →  /login
  _auth/onboarding.tsx     guard: redirectSignedOut     →  /onboarding
  _auth/accept-invitation.tsx   no guard                →  /accept-invitation
```

Four things to take from it:

- A pathless layout route with **no `component`** is a fine thing to write. It
  defaults to rendering `<Outlet />`, so `_public.tsx` exists only to hold a
  guard.
- The guard moved *down* rather than being merged. The subtrees want different
  answers, so no answer belongs on the shared parent — `_auth.tsx`'s comment
  names the hand-off a guard there would break (`_authenticated` sending an
  account with no workspace to `/onboarding`).
- A layout copied to change one detail becomes route `staticData` the one
  layout reads (`legalNoteKey`), and the copies disappear.
- Unifying chrome makes duplicate *content* obvious, and the refactor is not
  finished until you look for it.

## Reading the generated tree

`routeTree.gen.ts` has three maps. The one that answers "did I change a URL" is
`FileRoutesByTo` — the paths you may pass to `Link`/`navigate`:

```bash
sed -n '/interface FileRoutesByTo/,/^}/p' apps/web/src/routeTree.gen.ts
```

`FileRoutesById` shows the full ids including pathless segments
(`/_auth/_public/login`), which is what you want when debugging *which*
layout is wrapping a route. `FileRoutesByFullPath` sits between them.
