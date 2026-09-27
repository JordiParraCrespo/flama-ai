# @flama/backend-queue

Background job processing for the API using [BullMQ](https://docs.bullmq.io/)
(`@nestjs/bullmq`), plus a [Bull Board](https://github.com/felixmosh/bull-board)
dashboard for inspecting queues.

## What's inside

- `QueueModule` — registers BullMQ with Redis connection config from
  `@nestjs/config`. Queue names come from `QUEUE_NAMES` in `@flama/shared`.
- `setupBullBoard` — mounts the Bull Board UI on the Express instance.
- `jobId(...parts)` — builds a custom job id, joining the parts with `-`. It
  throws on a `:` or an all-digit id, the ids BullMQ refuses at `queue.add`.

## Usage

```ts
// module
import { QueueModule } from "@flama/backend-queue";

// main.ts — mount the dashboard
import { setupBullBoard } from "@flama/backend-queue";
setupBullBoard(app);

// a producer that deduplicates on its own key
import { jobId } from "@flama/backend-queue";
await queue.add("invitation", data, { jobId: jobId("invitation", invitationId) });
```

## Scripts

```bash
pnpm build   # tsc -> dist
pnpm dev     # tsc --watch
```

## Consumed by

`apps/api`.
