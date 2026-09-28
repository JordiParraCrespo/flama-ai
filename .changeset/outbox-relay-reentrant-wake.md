---
"@flama/backend-ddd": patch
---

A `wake()` from inside a delivery queues the next drain pass and returns; it no longer deadlocks the relay chain.
