---
"@flama/api": patch
"@flama/backend-core": minor
---

User and role search match `%` and `_` literally (`likeContains`, new in backend-core), and the term is trimmed and capped at 100 characters.
