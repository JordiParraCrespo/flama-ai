---
"@flama/backend-queue": minor
---

New `jobId(...parts)` helper joins a custom BullMQ job id from its parts and throws where BullMQ would refuse it (a `:`) or could mistake it for its own (any all-digit id).
