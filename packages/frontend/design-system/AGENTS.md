# design-system — Agent Instructions

Shared design system. This directory is a **container of two publishable
packages** plus shared tokens:

- [`web/`](./web) → `@flama/design-system-web` — shadcn + Tailwind (used by `apps/web` and `packages/frontend/web`)
- [`mobile/`](./mobile) → `@flama/design-system-mobile` — React Native + NativeWind (used by `apps/mobile` and `packages/frontend/mobile`)

> Read the root [`CLAUDE.md`](../../../CLAUDE.md) first. There is no package.json
> at this level — work inside `web/` or `mobile/`.

## The brand

Alpaca Labs: a **monochrome-first, flat** productivity aesthetic. The rules that
decide most design questions here:

- **Three inks carry the whole hierarchy** — `#292929` primary, `#5D5D5D`
  secondary, `#9E9E9E` tertiary — over white cards and a warm off-white canvas
  (`#F6F5F3`). Hierarchy comes from ink and weight, never from size alone.
- **Colour is a status signal, never decoration.** Blue `#2F80F6` (counts,
  toggles-on), cyan `#12B5CE` (live), pink `#EF3A6B` ("New"), purple `#7A5CFF`
  (avatars), plus the tinted active/paused/ended/draft pills. A coloured button
  or a coloured heading is a bug.
- **No elevation.** Cards, tiles and controls carry _no_ shadow — a hairline
  border and a surface-colour step do the work. Only genuinely floating layers
  (dialogs, menus, popovers) get depth, and only softly. `--shadow-sm`/`-md` are
  deliberately `none`.
- **Type is SF Pro at 400/500 only**, tracked -0.15px, in four sizes:
  12 (labels/badges), 13 (nav/meta), 14 (body/buttons/rows), 24 (headings).
  There is no bold — `font-bold` maps to 500.
- **Three radii plus the pill**: 8px controls, 12px tiles, 16px cards, and a
  pill for every CTA, chip, toggle and count badge.
- **Copy is sentence case and verb-first** ("Connect device", "New task"). No
  emoji, no Title Case buttons.

## Conventions

- **Design tokens are the shared source of truth.**
  [`web/src/styles/globals.css`](./web/src/styles/globals.css) is the canonical
  definition: brand primitives (`--ink-*`, `--surface-*`, `--accent-*`,
  `--status-*`, `--data-*`) first, then the shadcn semantic names aliased onto
  them, then the Tailwind mapping in `@theme inline`. Change the brand there;
  components should inherit it without edits.
- `apps/mobile/global.css` mirrors those
  tokens in the bare-HSL form NativeWind needs. They differ on purpose in two
  ways: hairlines are flattened to solid values (React Native cannot composite
  an rgba border), and every token is a literal triple rather than a `var()`
  alias (NativeWind resolves these at build time). **Keep the two in sync.**
- Prefer a **token** over a hardcoded value, and a **brand primitive**
  (`text-ink-400`, `bg-surface-sunken`) over a raw hex.
- The **shadcn component API is mirrored in the mobile package** — a component's
  props/variants should match across web and mobile so consumers get a
  consistent API on both platforms.
- Check a component or token change on the screens that use it: `apps/web`
  for this package's web half, `apps/mobile` for the mobile half, in **both**
  light and dark. A token change starts in `web/src/styles/globals.css` and
  lands in `apps/mobile/global.css` in the same change.
