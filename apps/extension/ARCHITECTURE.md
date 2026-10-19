# apps/extension Architecture — contexts that share nothing, one runtime between them

`apps/extension` is the consumer product as a Chrome extension. It is a
frontend app like `apps/web` — entrypoints compose, features contain, logic
lives in the packages below — with one difference that shapes everything
else: Chrome runs it as **several programs at once**, which share no memory,
do not have the same APIs, and are started and stopped by the browser rather
than by us.

This document is the source of truth for the app. `.dependency-cruiser.cjs`,
`src/__tests__/boundaries.spec.ts`, `scripts/check-frontend-structure.mjs` and
`.agents/rules/frontend-architecture.md` enforce what is described here. When
they disagree, fix the code or update both together. The tier-wide model is
[`packages/frontend/ARCHITECTURE.md`](../../packages/frontend/ARCHITECTURE.md).

## The contexts

```
                    ┌───────────────────────── chrome.storage ─────────────────────────┐
                    │  clips (one writer: the worker) · the query cache · kernel keys   │
                    └──────────────▲───────────────────────▲───────────────────────────┘
                                   │ read, watch           │ read, write
  ┌─ extension pages ──────────────┴──────┐    ┌───────────┴──────── service worker ──┐
  │  popup · side panel · options          │    │  src/background/                      │
  │  src/entrypoints → src/features        │    │  menus, the shortcut, saveTab,        │
  │  React, the kernel, the session cookie │◄──►│  the clips' one writer                │
  │                                        │ runtime messages (src/runtime/protocol.ts)│
  └────────────────────────────────────────┘    └───────────┬──────────────────────────┘
                                                             │ inject, then tab messages
                                                ┌────────────▼─────────── content script ┐
                                                │  src/content/  — in one tab, on demand  │
                                                │  reads the page, shows the toast        │
                                                └─────────────────────────────────────────┘
```

| Context | Lives | Has | Never has |
| --- | --- | --- | --- |
| **Pages** (popup, side panel, options) | while open; the popup only until it loses focus | DOM, React, the kernel, the session cookie | a page's DOM |
| **Service worker** | started for an event, stopped after ~30 idle seconds | `chrome.*`, `fetch` | DOM, React, memory between wakes |
| **Content script** | inside one tab, from injection until the tab navigates | that tab's DOM (an isolated world: none of its JavaScript) | most of `chrome.*`, the extension's state |

Three consequences, each a rule:

1. **State that must last is in `chrome.storage`, never in memory.** The
   worker forgets everything when Chrome stops it. Every persisted value is an
   item declared in `src/runtime/items.ts` with a Zod schema, and a value that
   no longer parses reads as the item's fallback — an older build's data never
   bricks a newer one.
2. **Contexts talk through one typed table.** `src/runtime/protocol.ts` names
   every message, what it carries and what it answers; `send`, `sendToTab`,
   `broadcast` and `listen` accept nothing else. A handler's error crosses the
   boundary as a `MessageError` with its code, and only this extension's own
   contexts are answered.
3. **Work that must outlive a page runs in the worker.** The popup closes the
   moment it loses focus, so "save this page" is a message to the worker, which
   does it; the popup only waits for the answer if it is still there.

## The layers

```
  src/entrypoints/        popup.tsx sidepanel.tsx options.tsx — compose, < 120 lines
      │
      ▼
  src/features/<module>/  screens sections dialogs forms components hooks lib __tests__
      │                   auth · profile · user-settings · clips
      ├────────► @flama/frontend-web         the web kit: auth chrome, theme, i18n
      │                 └──► @flama/design-system-web
      ├────────► @flama/frontend-consumer    profile, organizations
      ├────────► @flama/frontend-core        auth, session, FlamaApp
      ▼
  src/lib/                flama.ts auth-client.ts nav.ts query.ts — configuration only
      │
      ▼
  src/runtime/            protocol · messaging · storage · items · tabs · i18n · dev-reload
      ▲          ▲          the floor: the only code that calls chrome.*, no React
      │          │
  src/background/  src/content/      the worker and the content script, on the runtime alone
```

What `pnpm arch` holds, beyond the rules every frontend app shares
(`features-are-islands`, `routes-compose`, `forms-and-components-stay-pure`,
`one-product-per-app`, `kit-through-its-entry`):

| Rule | Why |
| --- | --- |
| `runtime-is-the-floor` | The runtime imports nothing above it and no React, so the worker and the content script can build on it. |
| `worker-holds-no-pages` | The worker has no DOM. A page, a feature or the kernel in its bundle is code that cannot run there. |
| `content-script-stays-small` | It is injected into somebody else's page: the runtime and its own modules, ~3 KB. |
| `pages-ask-the-worker` | A page never imports the worker's modules — it sends it a message. |

And what `pnpm test` holds, because `chrome` is a global that no import graph
shows: `boundaries.spec.ts` fails when `chrome.*` is called outside
`src/runtime/`, `src/background/` or `src/content/`. A feature that wants a
Chrome API gets a function in the runtime, and is testable without a browser.

## The surfaces

- **Popup** — one look at one tab. `CurrentPage` (clips) reads the tab it was
  opened over and saves it. Anything longer belongs in the side panel.
- **Side panel** — the extension's room to work in, beside any tab for as
  long as the person wants. The clip list follows `chrome.storage`, so a save
  from the shortcut appears there without a refresh.
- **Options page** — account, appearance, shortcuts, privacy. A first install
  opens it: the place to sign in, and to read what the extension can see
  before it is ever used.

Every page renders through `mount()` (`src/providers/mount.tsx`): the theme,
the persisted query cache, the kernel, the one `Toaster`, and the wait for the
reader's catalog. Each page is its own document with its own React root and
its own `FlamaApp`.

## The session

The session is the API's httpOnly cookie — the web app's, not a token of the
extension's. Chrome treats a request to a host in `host_permissions` as
same-site, so the cookie is set and sent like a first-party one, and the API
admits the extension's origin (`chrome-extension://<id>`) through
`EXTENSION_IDS`. Nothing secret is ever in `chrome.storage`.

Every page shares the browser's cookie jar, so a sign-in in one is a sign-in in
all; `session/changed` tells the open ones to look again
(`features/auth/hooks/use-session-sync.ts`), and `SessionGate` swaps the
sign-in screen for the page. A failed session lookup is an error with a retry,
never "signed out".

The profile is read with `useMyProfile` (consumer), whose query is kept out of
the persisted cache: a profile is not a thing to leave in storage, and an
entity restored from JSON would have lost its getters.

## Privacy, by construction

- No `content_scripts` and no host access to any website: the extension reads
  a page only after the person invokes it there (toolbar, menu, shortcut), via
  the `activeTab` grant that gesture gives, and only that tab.
- The content script reads the address, the title, the person's own selection
  and the page's published description — never form fields or the DOM at
  large — and draws its toast in a closed shadow root.
- No favicons are fetched for saved pages; a tile shows the site's initial.
- Saved pages stay in `chrome.storage.local`: never synced, never sent.
- No `externally_connectable`, no `web_accessible_resources`: no web page can
  message the extension or probe it.
- `manifest.spec.ts` holds the permission list. Adding one is a decision with
  a reason in the review, because Chrome disables the extension for every
  existing user until they accept the new prompt.

## Cookbook

### Add a message

1. Add it to `Protocol` in `src/runtime/protocol.ts`: `'<owner>/<verb>':
   { request; response }`, the owner being whoever answers.
2. Answer it in that context's `listen({...})` — the worker's is
   `src/background/index.ts`.
3. Call it with `send` (to the worker), `sendToTab` (to a content script) or
   `broadcast` (to every other page). A page wraps a call in a `useMutation`
   in its feature's `hooks/`.
4. A spec: a handler is a function, so test it directly with the fake
   `chrome` (`src/runtime/__tests__/fake-chrome.ts`).

### Keep something in `chrome.storage`

Declare it in `src/runtime/items.ts` with `defineItem({ area, key, schema,
fallback })`, and name its one writer in the comment. Read it in a page with
`useSyncExternalStore(storeOf(item).subscribe, …)` (see
`features/clips/hooks/use-clips.ts`); write it from its writer with
`item.update`. Pick the area for what it is: `local` for this browser,
`session` for until the browser closes, `sync` for small settings that should
follow the person to another machine.

### Add a feature to a page

`node scripts/scaffold-feature.mjs --app extension --module <module>` builds the
kind directories, a screen and the section it composes. Name the feature after
a module of the kernel or the consumer package; `clips` is this app's one
allowlisted local module. Mount it from an entrypoint, which stays under 120
lines. A feature that touches Chrome does it through `src/runtime/`.

### Read more of a page

Extend `PageSnapshot` and `readSnapshot` (`src/content/snapshot.ts`), and say
in the comment why the extension needs it. The content script is injected into
somebody else's document: read what the person can see, nothing else.

### Ask for a permission

Add it in `manifest.config.ts`, update `manifest.spec.ts` in the same diff, and
the privacy text in `extension.options.privacyDescription`. Prefer an
`optional_permissions` entry requested at the moment it is needed
(`chrome.permissions.request` inside a click) over a permission every install
asks for.
