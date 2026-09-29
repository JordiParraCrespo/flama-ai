# @flama/backend-queue

Background job processing for the API using [BullMQ](https://docs.bullmq.io/)
(`@nestjs/bullmq`).

## What's inside

- `QueueModule` — registers BullMQ with Redis connection config from
  `@nestjs/config`. Queue names come from `QUEUE_NAMES` in `@flama/shared`.
- `jobId(...parts)` — builds a custom job id from several parts, joined with
  `-`. It throws on a `:` or any all-digit id (`'007'` too), so an id BullMQ
  would refuse at `queue.add` fails where it is built. A UUID needs no helper.

## Usage

```ts
// module
import { QueueModule } from "@flama/backend-queue";

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
