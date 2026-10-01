---
"@flama/api": patch
"@flama/backend-core": minor
---

User and role search match `%` and `_` literally: searching `a_b` no longer
matches `axb` and `%` no longer matches every row. `@flama/backend-core` exports
`likeContains`, which builds the escaped `ILIKE` pattern. The search term is
trimmed and capped at 100 characters.
