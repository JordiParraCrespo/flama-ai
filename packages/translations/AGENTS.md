# @flama/translations — Agent Instructions

Shared i18n resources used by `apps/web` (react-i18next) and `apps/mobile`
(i18next).

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first.

## Layout

```
en/index.json         # English locale
es/index.json         # Spanish locale
index.ts              # exports the locale bundles
```

## Conventions

- **New translations go in `packages/translations/{locale}/index.json`** — not
  inline in app code.
- Keep the key structure identical across every locale; add a key to _all_
  locales when introducing new copy so nothing falls back silently.
- Both web and mobile consume the same bundles, so keys must stay
  platform-neutral.

## Commands

```bash
pnpm --filter @flama/translations lint
```
