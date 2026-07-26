# @flama/design-system-web — Agent Instructions

Web UI component library: shadcn/ui components + Tailwind, built with tsup.
Consumed by `apps/web` and `apps/web-showcase`.

> Read the root [`CLAUDE.md`](../../../CLAUDE.md) and the design-system overview
> in [`../AGENTS.md`](../AGENTS.md) first.

## Layout

```
src/
├── components/   # shadcn-based components
├── hooks/        # UI hooks
├── lib/          # utils (cn, variants, etc.)
├── styles/       # shared styles
└── index.ts      # public exports
tailwind.config.ts
tsup.config.ts    # build config
```

## Conventions

- Components follow **shadcn** conventions. Keep the component API (props,
  variants) mirrored with `@flama/design-system-mobile` so both platforms stay
  consistent.
- Colors/spacing/typography come from the shared design tokens — don't hardcode.
- Export new components from `index.ts`; preview them in `apps/web-showcase`.

## Commands

```bash
pnpm --filter @flama/design-system-web build
pnpm --filter @flama/design-system-web dev
```
