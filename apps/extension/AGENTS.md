# @flama/extension — Agent Instructions

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first for repo-wide conventions,
> and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for this app's contexts and layers.

## Stack

- Manifest V3 Chrome extension. The manifest is `manifest.config.ts`, generated
  at build time — there is no `manifest.json` to edit
- Vite, three bundles (pages, service worker, content script) into `dist/`
  through `scripts/build.mjs`; `pnpm dev` rebuilds and reloads the extension
- React 19 + React Compiler, Tailwind v4, `@flama/design-system-web`, the web kit
  `@flama/frontend-web`; `@flama/frontend-consumer` is this app's product
- Copy in `@flama/translations` under `extension.*`; what Chrome itself shows
  (`_locales/`) is written from `extension.chrome`
- Config from the **root `.env`**, `EXTENSION_PUBLIC_*` only

## Where code goes

- A call to `chrome.*` → a function in `src/runtime/`. Nowhere else but the
  worker (`src/background/`) and the content script (`src/content/`) may
  touch `chrome`; `boundaries.spec.ts` fails otherwise.
- A message between contexts → `src/runtime/protocol.ts` first, then its
  handler in the context that answers it.
- Anything persisted → an item in `src/runtime/items.ts`, with a schema, a
  fallback and its one writer named.
- Work that must survive the popup closing → the service worker, asked by
  message.
- UI → `src/features/<module>/<kind>/`, mounted by an entrypoint in
  `src/entrypoints/` that stays under 120 lines.
- `src/lib/` holds only `flama.ts`, `auth-client.ts`, `nav.ts`, `query.ts`.

## Before pushing

```bash
pnpm --filter @flama/extension lint
pnpm --filter @flama/extension test
pnpm --filter @flama/extension arch
pnpm --filter @flama/extension build && pnpm --filter @flama/extension e2e
pnpm check:structure && pnpm check:compiler
```

## Patterns agents get wrong

- Registering a service-worker listener inside a callback or after an
  `await`. Chrome delivers the event that woke the worker only to listeners
  added in its first turn — every `addListener` is at the top level of
  `src/background/index.ts`.
- Keeping state in a worker variable. The worker is stopped after thirty idle
  seconds; the variable is gone and nothing says so. Use an item.
- `await`ing anything before `chrome.sidePanel.open()` in a click. The user
  gesture does not survive the `await`; read what you need beforehand
  (`useCurrentWindow`).
- Declaring a `content_scripts` entry or a broad `host_permissions` pattern to
  "make injection work". The extension reads a page through `activeTab` after
  the person asks; widening that changes the install prompt for everyone.
- Reading the profile with `useProfile` (kernel). Its query is persisted, and
  an entity restored from storage has lost its getters — use `useMyProfile`
  from `@flama/frontend-consumer/react`.
- An inline `<script>` in a page's HTML. MV3 forbids it outright; put it in
  `public/` as a file.

Placement is [`.agents/rules/frontend-architecture.md`](../../.agents/rules/frontend-architecture.md);
what the markup looks like is [`.agents/rules/frontend-ui.md`](../../.agents/rules/frontend-ui.md).
