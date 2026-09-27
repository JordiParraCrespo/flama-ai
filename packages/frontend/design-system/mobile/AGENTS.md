# @flama/design-system-mobile — Agent Instructions

Mobile UI component library: React Native components styled with **NativeWind**
(Tailwind for RN). Consumed by `apps/mobile` and `packages/frontend/mobile`.

> Read the root [`CLAUDE.md`](../../../../CLAUDE.md) and the design-system overview
> in [`../AGENTS.md`](../AGENTS.md) first.

## Layout

```
src/
├── components/         # React Native components
├── hooks/              # React Native-only hooks (useHardwareBack), exported from index.ts
├── lib/               # utils (cn, variants, etc.)
├── nativewind-env.d.ts
└── index.ts           # public exports
```

## Conventions

- Styling is **NativeWind** (Tailwind classes on RN primitives), not Tamagui.
- **Mirror the shadcn component API** from `@flama/design-system-web`: matching
  prop/variant names so consumers get a consistent cross-platform API.
- `src/hooks/` holds only what is about React Native. A hook with nothing in
  it but React — `useControlled`, `useDebounced*`, `useNow` — lives once in
  `@flama/react-hooks`, which this package imports and does not re-export.
- Colors/spacing/typography come from the shared design tokens — don't hardcode.
- Export new components from `index.ts`, and look at each one on a screen in
  `apps/mobile`, light and dark.

## Commands

```bash
pnpm --filter @flama/design-system-mobile build
pnpm --filter @flama/design-system-mobile dev
```

See [`.agents/rules/frontend-ui.md`](../../../../.agents/rules/frontend-ui.md) and [`.agents/rules/forms.md`](../../../../.agents/rules/forms.md).
