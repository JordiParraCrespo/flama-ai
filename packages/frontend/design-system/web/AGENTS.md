# @flama/design-system-web — Agent Instructions

Web UI component library: shadcn/ui components + Tailwind, built with tsup.
Consumed by `apps/web` and `packages/frontend/web`.

> Read the root [`CLAUDE.md`](../../../../CLAUDE.md) and the design-system overview
> in [`../AGENTS.md`](../AGENTS.md) first.

## Layout

```
src/
├── components/   # shadcn-based components
├── hooks/        # web-only hooks (useIsMobile), exported from index.ts
├── lib/          # utils (cn, variants, etc.)
├── styles/       # shared styles
└── index.ts      # public exports
tailwind.config.ts
tsup.config.ts    # build config
```

## Conventions

- `src/hooks/` holds only what is about the web (the viewport, the DOM). A
  hook with nothing in it but React — `useControlled`, `useDebounced*`,
  `useNow` — lives once in `@flama/react-hooks`, which this package imports
  and does not re-export.
- Components follow **shadcn** conventions. Keep the component API (props,
  variants) mirrored with `@flama/design-system-mobile` so both platforms stay
  consistent.
- Colors/spacing/typography come from the shared design tokens — don't hardcode.
- **Export new components from `index.ts`.** This is enforced:
  `scripts/check-exports.mjs` runs as the package's `test` script and fails the
  build when a file in `src/components/` exports something the barrel does not.
  `apps/web` takes components from the root (only icons by subpath), so a
  component the barrel does not export does not exist for the product —
  which is how `Breadcrumb` and `Collapsible` sat unused until an audit went
  looking, by which time a screen had hand-rolled a breadcrumb.
  If something must stay internal, do not export it from its own module either.
- Look at a new component on a screen in `apps/web`, light and dark.

## Commands

```bash
pnpm --filter @flama/design-system-web build
pnpm --filter @flama/design-system-web dev
pnpm --filter @flama/design-system-web test   # the barrel-export check
```

See [`.agents/rules/frontend-ui.md`](../../../../.agents/rules/frontend-ui.md) for how the apps consume these components.
