# design-system — Agent Instructions

Shared design system. This directory is a **container of two publishable
packages** plus shared tokens:

- [`web/`](./web) → `@flama/design-system-web` — shadcn + Tailwind (used by `apps/web`, `apps/web-showcase`)
- [`mobile/`](./mobile) → `@flama/design-system-mobile` — React Native + NativeWind (used by `apps/mobile`, `apps/mobile-showcase`)

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first. There is no package.json
> at this level — work inside `web/` or `mobile/`.

## Conventions

- **Design tokens** (colors, spacing, typography) are the shared source of
  truth; the web and mobile packages consume the same tokens so the two
  platforms stay visually consistent.
- The **shadcn component API is mirrored in the mobile package** — a component's
  props/variants should match across web and mobile so consumers get a
  consistent API on both platforms.
- Preview components in the matching showcase app (`apps/web-showcase` /
  `apps/mobile-showcase`) when adding or changing them.
