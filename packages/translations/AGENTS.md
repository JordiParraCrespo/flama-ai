# @flama/translations — Agent Instructions

Shared i18n resources used by `apps/web` (react-i18next) and `apps/mobile`
(i18next).

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first.

## Layout

```
en/index.json         # English locale
es/index.json         # Spanish locale
locales.ts            # locale list, default, namespace, Messages type — no catalogs
lazy.ts               # one dynamic import per catalog, for the browsers
index.ts              # the eager barrel: every catalog, for the API and Expo
```

**Three entrypoints, and which one you want matters.** `index.ts` imports every
catalog, which is right for the API (it renders email in the recipient's locale)
and for the Expo apps (bundled ahead of time, no network). It is wrong for the
web apps: pulling `locales` or `Messages` from the root used to put the Spanish
catalog in the entry chunk an English reader downloads before anything renders.
So:

- metadata (`locales`, `defaultLocale`, `defaultNS`, `Locale`, `Messages`) →
  `@flama/translations/locales`
- a catalog, on demand, in a browser → `@flama/translations/lazy`
- every catalog at once → `@flama/translations`

Adding a locale means a directory, an entry in `locales.ts`, and a line in
`lazy.ts`'s loader map — written out longhand, because a bundler cannot split a
template-string import.

## Conventions

- **New translations go in `packages/translations/{locale}/index.json`** — not
  inline in app code.
- Keep the key structure identical across every locale; add a key to _all_
  locales when introducing new copy so nothing falls back silently.
- Both web and mobile consume the same bundles, so keys must stay
  platform-neutral.
- The `validation.*` keys back form validation: `createZodErrorMap` in
  `@flama/frontend/validation` resolves a Zod issue code to one of them. Adding
  a case there means adding the key here, in every locale — the apps type `t()`
  against this catalog, so a missing entry fails the build rather than shipping
  a raw key. See [`.agents/rules/forms.md`](../../.agents/rules/forms.md).
- Interpolate validation bounds with named params (`{{min}}`, `{{max}}`), not
  `count` — i18next reads `count` as a pluralisation trigger and looks for
  `_one` / `_other` variants.

## Commands

```bash
pnpm --filter @flama/translations lint
```
