# @flama/backend-queue — Agent Instructions

BullMQ job queues plus a Bull Board dashboard for the NestJS API.

> Read the root [`CLAUDE.md`](../../../CLAUDE.md) and
> [`.claude/rules/backend-packages.md`](../../../.claude/rules/backend-packages.md).

## Layout

```
src/
├── queue.module.ts       # NestJS module (register queues)
├── bull-board.setup.ts   # Bull Board admin UI wiring
└── index.ts
```

## Conventions

- Queue names are defined centrally as `QUEUE_NAMES` in `@flama/shared` — use
  them, don't hardcode strings.
- Producers/consumers live in `apps/api` (`src/queue/`); this package provides
  the module wiring and dashboard.
- Ships **CommonJS**.

## Commands

```bash
pnpm --filter @flama/backend-queue build
pnpm --filter @flama/backend-queue dev
```
