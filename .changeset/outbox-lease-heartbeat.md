---
"@flama/backend-ddd": minor
"@flama/api": patch
---

The outbox relay renews the leases of the rows still waiting before each row, skips a row it lost, and `markProcessed`/`markFailed` now take the relay `owner` and only touch rows it still leases.
