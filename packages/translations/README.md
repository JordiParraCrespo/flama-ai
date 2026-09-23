# @flama/translations

Shared i18n resources for web and mobile. Locale JSON lives here so both
frontends render the same copy from one source.

## What's inside

- `en/index.json`, `es/index.json` — translation catalogs (one namespace per locale).
- `locales.ts` — locale metadata with **no** catalog imports: `locales`,
  `defaultLocale`, `defaultNS`, `type Locale`, `type Messages`.
- `lazy.ts` — `loadLocaleMessages(locale)`, one dynamic import per catalog, so a
  bundler emits a chunk per locale.
- `index.ts` — the eager barrel: `resources` and `messages` with every catalog
  loaded, plus a re-export of everything in `locales.ts`.

## Usage

Pick the entrypoint by what the platform can afford to load.

```ts
// Ahead-of-time bundles and the server — every catalog, no network.
// apps/api renders email in the recipient's locale; Expo has no runtime fetch.
import { resources, defaultNS } from "@flama/translations";

// Browsers — metadata only, no catalogs. Importing `locales` from the root
// would put every catalog in the entry chunk.
import { defaultLocale, defaultNS, locales } from "@flama/translations/locales";

// Browsers — one catalog, when it turns out to be the reader's.
import { loadLocaleMessages } from "@flama/translations/lazy";

// Raw JSON is also reachable per-locale:
import en from "@flama/translations/en";
```

Each app wires these into its own i18next instance:

- `apps/web` (and `apps/admin-web`, a plugin) use `react-i18next`, bundling only
  `defaultLocale` and serving the rest through a small backend module over
  `loadLocaleMessages` (see `packages/frontend/web/src/i18n/lib/i18n.ts`).
- `apps/mobile` (and `apps/admin-mobile`, a plugin) use `i18next` + `react-i18next` with
  the eager `resources`, persisting the choice with `expo-secure-store` (see
  `packages/frontend/mobile/src/i18n/lib/i18n.ts`).

## Adding a translation

Add the key to **every** locale file under the matching path
(`packages/translations/{locale}/{area}.json`), then run
`pnpm --filter @flama/translations assemble` so the generated
`{locale}/index.json` matches. Keys must exist in all locales so
`t()` never falls back unexpectedly.

## Adding a locale

Three edits: the catalog directory, an entry in `locales.ts`'s `locales` tuple,
and a line in `lazy.ts`'s loader map. The map is written out longhand because a
bundler cannot split a template-string `import()` — a computed specifier either
bundles every match or resolves nothing.

## Consumed by

`apps/web` and `apps/mobile` (and the control-plane plugins), `apps/api`.
