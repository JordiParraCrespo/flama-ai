---
"@flama/api": minor
"@flama/api-client": minor
---

`GET /v1/access-grants` is paginated (`{ data, meta }`, `page`/`limit`, max 100), the scope resolver reads grants in one statement shape, and creating a grant returns the grant it created.
