# @flama/web-showcase

A Next.js gallery of the web design system. Every component and block that
`@flama/design-system-web` exports is rendered here so it can be browsed and
reviewed visually, in light and dark, before it lands in a product screen.
It carries no product logic and talks to no API.

## Running it

```bash
pnpm --filter @flama/web-showcase dev     # http://localhost:3002
pnpm --filter @flama/web-showcase build
pnpm --filter @flama/web-showcase lint
```

## Layout

```
src/
├── app/            # Next.js App Router: a single page rendering every gallery section in order
├── components/     # each gallery section (foundations, forms, patterns, chat, mail,
                    # lead-table, data-cells, component-demos) plus the showcase chrome
└── lib/toc.ts      # the page's table of contents
```

The design system itself lives in `packages/frontend/design-system/web`; a component is
added there and then given a page here. The `/design-export-port` skill
rebuilds this gallery from a design export.

## Depends on / used by

Depends on `@flama/design-system-web`. Nothing depends on it; it is an
optional app the starter prunes with `scripts/starter/features.json`.

See [`AGENTS.md`](./AGENTS.md) for the conventions.
