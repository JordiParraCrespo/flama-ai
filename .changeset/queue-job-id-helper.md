---
"@flama/backend-queue": minor
"@flama/api": patch
---

New `jobId(...parts)` helper builds a custom BullMQ job id and throws where BullMQ would: on a `:` (BullMQ refuses it at `queue.add`, except for ids with exactly two, which makes the failure data-dependent) or an all-digit id. The outbox relay builds its job ids through it.
