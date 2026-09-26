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

The **Foundations** section (`/foundations`) is the rendered reference for the
tokens: check a token or component change there in **both** light and dark —
the sidebar carries the theme switch.

## Rebuilding it from a design export

`/design-export-port` lands an export on `@flama/design-system-web`; this
gallery is the optional last step. `src/lib/toc.ts` lists the inventory in
the export's grouping; each entry is a `<Spec id>` on the page showing every
state the screens use, with a usage line; foundations come first, colours in
both themes side by side. Keep the existing demo files where they still show
a component the inventory keeps, and replace the ones that show what was
dropped. Sections that hold state are client components.

Build, then shoot it: `scripts/shoot.mjs` starts the built app, captures the
top and the section ids you name in light and dark, applies both theme
selectors, and exits non-zero on console errors or a server that never
answers.

```bash
pnpm --filter @flama/web-showcase build
node apps/web-showcase/scripts/shoot.mjs --out /tmp/shots --sections colors,type,buttons
```

## Rules

[`.agents/rules/frontend-ui.md`](../../.agents/rules/frontend-ui.md) holds for
this gallery too, with one exception: it builds its tables on the `Table`
primitives rather than `DataTable`, which ships in `@flama/frontend-web` and
belongs to the product apps. It imports each component by its `./name`
subpath, so it is not what keeps the package barrel honest — `apps/web` is.
