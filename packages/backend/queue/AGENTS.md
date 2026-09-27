# @flama/backend-queue — Agent Instructions

BullMQ job queues plus a Bull Board dashboard for the NestJS API.

> Read the root [`CLAUDE.md`](../../../CLAUDE.md) and
> [`.agents/rules/backend-packages.md`](../../../.agents/rules/backend-packages.md).

## Layout

```
src/
├── queue.module.ts       # NestJS module (register queues)
├── bull-board.setup.ts   # Bull Board admin UI wiring
├── job-id.ts             # jobId(): custom job ids BullMQ accepts
└── index.ts
```

## Conventions

- Queue names are defined centrally as `QUEUE_NAMES` in `@flama/shared` — use
  them, don't hardcode strings.
- A custom `jobId` goes through `jobId(...parts)` from this package. BullMQ
  throws at `queue.add` on an id with a `:` (or an integer), which a mocked
  queue in a unit test never shows; the helper throws the same way wherever the
  id is built.
- Producers/consumers live in `apps/api` (`src/queue/`); this package provides
  the module wiring and dashboard.
- Ships **CommonJS**.

## Commands

```bash
pnpm --filter @flama/backend-queue build
pnpm --filter @flama/backend-queue dev
```
