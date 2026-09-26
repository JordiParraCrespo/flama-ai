# @flama/mobile-showcase — Agent Instructions

Expo showcase/gallery for the **mobile** design system.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first for repo-wide conventions.

## Purpose

A living catalog that renders the components exported by
`@flama/design-system-mobile` on a real device/simulator so they can be
browsed and visually reviewed. Demo surface only — no product business logic.

## Stack

- **Expo** + **expo-router** (`app/`)
- **NativeWind** (Tailwind for React Native)
- Components from `@flama/design-system-mobile`; component metadata in `registry/`

## Layout

```
app/                  # expo-router screens
registry/             # showcase component registry
app.config.ts         # Expo config
metro.config.js       # monorepo-aware Metro config
```

## Commands

```bash
pnpm --filter @flama/mobile-showcase dev
pnpm --filter @flama/mobile-showcase ios
pnpm --filter @flama/mobile-showcase android
```

See [`.agents/rules/frontend-ui.md`](../../.agents/rules/frontend-ui.md) and [`.agents/rules/forms.md`](../../.agents/rules/forms.md).
`lint:design` lints `app` and `lib` only.

`global.css` mirrors the design-system tokens in the bare-HSL form NativeWind
needs, like `apps/mobile/global.css`; keep it in step with
`packages/frontend/design-system/web/src/styles/globals.css`, the source of
truth. Preview a new `@flama/design-system-mobile` component here as well as
on a screen in `apps/mobile`.
