# @flama/web-showcase — Agent Instructions

Next.js showcase/gallery for the **web** design system.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first for repo-wide conventions.

## Purpose

A living catalog that renders the components and blocks exported by
`@flama/design-system-web` so they can be browsed and visually reviewed. This
is a demo surface — it does not hold product business logic.

## Stack

- **Next.js** (App Router) — `src/app/`
- **Tailwind CSS** + shadcn components from `@flama/design-system-web`

## Layout

```
src/app/
├── layout.tsx
├── page.tsx           # single page: every gallery section, in order
└── globals.css
src/components/        # each gallery section (foundations, forms, patterns,
                        # chat, mail, lead-table, data-cells, component-demos)
                        # plus the showcase chrome (sidebar, top bar, shell)
src/lib/toc.ts          # the page's table of contents
```

## Commands

```bash
pnpm --filter @flama/web-showcase dev
pnpm --filter @flama/web-showcase build
```

See [`.agents/rules/frontend-ui.md`](../../.agents/rules/frontend-ui.md) for the design-system rules this gallery demonstrates.
