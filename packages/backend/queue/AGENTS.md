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
- A custom `jobId` joined from parts goes through `jobId(...parts)` from this
  package. BullMQ throws at `queue.add` on an id with a `:` or one that reads
  as an integer, which a mocked queue in a unit test never shows; the helper
  throws where the id is built, and refuses every all-digit id (`'007'`
  included, which BullMQ's own check lets by). An id that is already a single
  safe value — a UUID row id — goes in as it is, without the helper.
- Producers/consumers live in `apps/api` (`src/queue/`); this package provides
  the module wiring and dashboard.
- Ships **CommonJS**.

## Commands

```bash
pnpm --filter @flama/backend-queue build
pnpm --filter @flama/backend-queue dev
```
