# @flama/backend-queue

Background job processing for the API using [BullMQ](https://docs.bullmq.io/)
(`@nestjs/bullmq`), plus a [Bull Board](https://github.com/felixmosh/bull-board)
dashboard for inspecting queues.

## What's inside

- `QueueModule` — registers BullMQ with Redis connection config from
  `@nestjs/config`. Queue names come from `QUEUE_NAMES` in `@flama/shared`.
- `setupBullBoard` — mounts the Bull Board UI on the Express instance.

## Usage

```ts
// module
import { QueueModule } from "@flama/backend-queue";

// main.ts — mount the dashboard
import { setupBullBoard } from "@flama/backend-queue";
setupBullBoard(app);
```

## Scripts

```bash
pnpm build   # tsc -> dist
pnpm dev     # tsc --watch
```

## Consumed by

`apps/api`.
