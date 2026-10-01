---
"@flama/api": patch
"@flama/translations": patch
---

Creating a role no longer falls back to a global role when the request has no
organization. `POST /v1/roles` without an active organization answers `ROLE_008`
(400) instead of writing a role every tenant reads, except for a platform admin
(`manage all`), who keeps creating global roles. `CreateRoleCommand.global` is the
explicit ask, and the handler checks `manage all` again before writing it. Adds
the `ROLE_008` message in both locales.
