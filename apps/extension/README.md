# @flama/extension

The consumer product in Chrome: a Manifest V3 extension that saves the page
you are on to Flama and keeps your account one click away. It is the starting
point for a product's own extension — every part of an extension is here once,
working, tested, and small enough to read in an afternoon:

| Surface | What it is | Where |
| --- | --- | --- |
| **Popup** | The toolbar button (`Alt+Shift+F`): the page under it and one thing to do with it | `src/entrypoints/popup.tsx` |
| **Side panel** | A room beside any tab, open as long as you want it: the saved pages, live | `src/entrypoints/sidepanel.tsx` |
| **Options page** | Account, appearance, shortcuts, and what the extension can see; opened on first install | `src/entrypoints/options.tsx` |
| **Service worker** | The menu, the shortcut (`Alt+Shift+S`) and the work that must outlive a page | `src/background/` |
| **Content script** | Injected into one tab when the person asks; reads the page, shows a toast | `src/content/` |

It signs in with the same Better Auth session the web app uses — the API's
httpOnly cookie — and reaches the API through the same kernel
(`@flama/frontend-core`) and product package (`@flama/frontend-consumer`). The
screens are built from `@flama/design-system-web` and the web kit, so the
extension looks like the product because it is the product.

## Stack

- Vite, building three bundles into one `dist/` (pages, service worker,
  content script — `vite.config.ts` says why three), driven by
  `scripts/build.mjs`
- The manifest written as typed code (`manifest.config.ts`), generated at
  build time, its permission list held by a test
- React 19 with the React Compiler, Tailwind v4, `@flama/design-system-web`
- TanStack Query, persisted to `chrome.storage.local`, so the popup opens on
  the last answers instead of a spinner
- react-i18next over `@flama/translations` (`extension.*`); Chrome's own
  strings (`_locales/`) are written from the same catalog
- Typed messaging and typed, validated storage over `chrome.*`
  (`src/runtime/`), the only code that calls Chrome
- Vitest against an in-memory `chrome`; Playwright against a real Chromium

## Run it

Configuration comes from the **root `.env`**; only `EXTENSION_PUBLIC_*` values
reach the bundle.

```bash
pnpm docker:dev                          # Postgres + Redis
pnpm --filter @flama/api dev             # the API the extension signs in to
pnpm --filter @flama/extension keygen    # once: pins the extension id (see below)
pnpm --filter @flama/extension dev       # build on save, into apps/extension/dist
```

Then open `chrome://extensions`, switch on **Developer mode**, choose **Load
unpacked** and pick `apps/extension/dist`. Do that once: `dev` runs a reload
server, and the development build's service worker reloads the whole extension
on every rebuild.

### Signing in from the extension

The API admits an extension by its origin, `chrome-extension://<id>`, and an
unpacked extension's id comes from its folder path — different on every
machine. `keygen` prints a public key that fixes it, and the id it produces:

```bash
pnpm --filter @flama/extension keygen
# EXTENSION_PUBLIC_KEY=MIIBIjANBgkqh…   → the manifest's `key`, which pins the id
# EXTENSION_IDS=<32 letters, a–p>       → the API's trusted origins
```

Put both lines in the root `.env`, restart the API, rebuild the extension.
`EXTENSION_IDS` takes a comma-separated list: add the Web Store's id when the
extension is published.

## Every command

```bash
pnpm --filter @flama/extension dev      # watch build + reload server
pnpm --filter @flama/extension build    # tsc -b, then the production build
pnpm --filter @flama/extension test     # Vitest + the build tools' node tests
pnpm --filter @flama/extension e2e      # Playwright: the built extension in Chromium
pnpm --filter @flama/extension zip      # release/flama-extension-<version>.zip
pnpm --filter @flama/extension lint
pnpm --filter @flama/extension lint:design
pnpm --filter @flama/extension arch     # dependency-cruiser
```

`e2e` loads `dist/` into Chromium (`pnpm --filter @flama/extension exec
playwright install chromium` once) and
answers the API itself, so it needs nothing else running.

## Publishing

1. Bump `version` in `package.json` — Chrome refuses an update whose version is
   not higher.
2. `pnpm --filter @flama/extension build && pnpm --filter @flama/extension zip`.
   `zip` refuses a development build, drops the source maps and the `key`
   (the store assigns its own), and writes a reproducible archive: the same
   `dist/` always zips to the same bytes.
3. Upload `release/flama-extension-<version>.zip` in the Chrome Web Store
   developer dashboard. Point `EXTENSION_PUBLIC_API_URL` at production before
   building — it is also the manifest's host permission.
4. Add the published id to the API's `EXTENSION_IDS`.

The listing's name and description come from `extension.chrome` in
`@flama/translations`, per locale. The privacy section of the options page is
the permission list in words; keep the two in step (`manifest.spec.ts` fails
when the list changes).

## Layout

```
manifest.config.ts       the manifest, as typed code
popup.html sidepanel.html options.html
public/                  icons, theme-init.js (the theme before first paint)
scripts/                 build, store-zip, keygen, the reload server, the zip writer
src/
├── entrypoints/         popup.tsx sidepanel.tsx options.tsx — compose, never contain
├── background/          the service worker: menus, the shortcut, saving a tab
├── content/             the content script: reading a page, the toast
├── runtime/             the only code that calls chrome.*: protocol, messaging,
│                        storage, items, tabs, i18n, dev reload
├── features/<module>/   auth, profile, user-settings, clips — kind directories
├── lib/                 flama.ts, auth-client.ts, nav.ts, query.ts
├── providers/           the root every page renders in
└── styles/globals.css
playwright/              the built extension, in Chromium
```

How the parts fit, and the cookbook for adding one, is
[`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Not in the box

- **Social sign-in.** A provider's redirect cannot land back in a popup that
  closed when it lost focus. Use `chrome.identity.launchWebAuthFlow` from the
  service worker (add the `identity` permission), and add
  `https://<id>.chromiumapp.org/` to the provider's redirect URLs; then pass
  `socialProviders` in `src/lib/flama.ts` as the web app does.
- **Content scripts on every page.** Nothing is declared in the manifest's
  `content_scripts`, deliberately: the install prompt asks for access to no
  website. A feature that truly needs to run on a site's every load declares
  that site in `host_permissions` and says why in its review.
- **Firefox and Safari.** The code is plain MV3, but nothing here is tested
  there.
