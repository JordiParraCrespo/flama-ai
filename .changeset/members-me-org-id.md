---
"@flama/api": patch
"@flama/api-client": patch
---

`GET /v1/organizations/:orgId/members/me` answers for the organization in the
path. It returned the caller's membership in the session's *active*
organization and ignored `:orgId`: a caller in two workspaces got the wrong
one, an API token without a pinned organization got an error, and a caller
could read their own active membership through any organization's path,
including one they do not belong to (now `403`). The OpenAPI document now
declares the `orgId` path parameter, so `OrganizationMembersApi.active(orgId)`
and the generated SDK's `active({ path: { orgId } })` send it.
