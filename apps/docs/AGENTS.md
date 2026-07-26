# @flama/docs — Agent Instructions

Docusaurus documentation site.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first for repo-wide conventions.

## Stack

- **Docusaurus** — config in `docusaurus.config.ts`, nav in `sidebars.ts`
- Markdown/MDX content in `docs/`
- Custom React/CSS overrides in `src/`, static assets in `static/`
- Shipped as a static site (Dockerfile for container hosting)

## Layout

```
docs/                 # documentation pages (Markdown/MDX)
src/css/              # theme overrides
static/               # images and static assets
docusaurus.config.ts  # site config
sidebars.ts           # sidebar/navigation
```

## Commands

```bash
pnpm --filter @flama/docs dev     # local dev server
pnpm --filter @flama/docs build   # static build
pnpm --filter @flama/docs serve   # serve the build
```
