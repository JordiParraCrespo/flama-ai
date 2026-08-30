---
"@flama/api": major
"@flama/shared": major
"@flama/api-client": major
---

Scope the default role's `User` permissions to the caller's own record.

The seeded `user` role granted unconditional `read User` and `update User`, so
every signed-in account could read and write every other account. That made
`GET /v1/users` a directory of every registered email address, and
`PATCH /v1/users/:id` an IDOR — one that reached privilege escalation, because
`updateUserSchema` accepted `role` and Better Auth's admin plugin gates
`/api/auth/admin/*` on exactly that column. Two requests took a fresh sign-up to
holding a session as any user in the deployment.

Four changes close it:

- Both rules are now scoped with `conditions: { id: '${user.id}' }`, matching the
  `ApiToken` rules that already worked this way. A migration rewrites the seeded
  role in place, preserving any permission an admin has since added.
- `updateUserSchema` no longer declares `role`. A self-service profile edit has
  no business carrying a privilege field; role changes go through
  `PUT /v1/users/:userId/roles` or the admin plugin's `set-role`.
- `GET /v1/users/:id` and `PATCH /v1/users/:id` re-check the loaded row against
  the caller's ability, since `PoliciesGuard` only sees action and subject. The
  update checks _before_ it writes.
- `GET /v1/users` now requires `manage User`. It returns the whole directory,
  which a per-caller condition cannot express as a page.

**Breaking.** `UpdateUserRequest` loses `role`, so a client sending it will find
the field silently dropped. Any non-admin caller that relied on listing or
reading other users now receives `403`; organization-scoped member endpoints
cover the legitimate cases. `Subjects` in `@flama/shared` is unchanged, but the
new `canAccess()` helper is the supported way to check a permission against a
concrete row.
