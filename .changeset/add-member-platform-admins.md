---
"@flama/api": patch
"@flama/api-client": patch
---

`POST /v1/organizations/:orgId/members` adds an existing account without its
consent, so it now also needs `manage all` (a platform administrator). An
organization owner brings people in by invitation, which they accept.
