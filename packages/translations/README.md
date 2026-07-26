# @flama/translations

Shared i18n resources for web and mobile. Locale JSON lives here so both
frontends render the same copy from one source.

## What's inside

- `en/index.json`, `es/index.json` — translation catalogs (one namespace per locale).
- `index.ts` — typed helpers consumed by the i18next setup in each app:
  `locales`, `defaultLocale`, `type Locale`, `resources`, `defaultNS`.

## Usage

```ts
import {
  locales,
  defaultLocale,
  resources,
  defaultNS,
} from "@flama/translations";

// Raw JSON is also reachable per-locale:
import en from "@flama/translations/en";
```

Each app wires these into its own i18next instance:

- `apps/web` uses `react-i18next`.
- `apps/mobile` uses `i18next` + `react-i18next`, persisting the choice with
  `expo-secure-store` (see `apps/mobile/lib/i18n.ts`).

## Adding a translation

Add the key to **every** locale file under the matching path
(`packages/translations/{locale}/index.json`). Keys must exist in all locales so
`t()` never falls back unexpectedly.

## Consumed by

`apps/web`, `apps/mobile`.
