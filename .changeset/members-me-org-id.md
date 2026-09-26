---
"@flama/api": patch
"@flama/api-client": patch
---

`GET /v1/organizations/:orgId/members/me` answers for the organization in the
path, not the session's active one, and organization-scoped routes are
authorized by the caller's roles in the path's organization. The client
method is now `getMembership(orgId)` (the SDK's `getMembership({ path: { orgId } })`),
with `orgId` required.
