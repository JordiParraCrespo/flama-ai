---
"@flama/shared": minor
"@flama/api": minor
---

Add first-class REST modules for organizations, members, invitations, workspaces
and admin (super-admin) — delegating façades over the Better Auth plugins.

These expose the Better Auth organization/admin plugin operations as typed,
Swagger-documented, CASL-guarded NestJS endpoints so they appear in the generated
`@flama/api-client` (the plugins' own `/api/auth/*` endpoints are not NestJS
controllers and never did). The controllers/services delegate to `auth.api.*`
(via `auth/better-auth.util.ts`) rather than writing the Better-Auth-owned tables,
so Better Auth remains the single source of truth — no domain duplication.

- **`@flama/api`**: new `organizations` module — `OrganizationsController`
  (`/v1/organizations`: create/update/delete/set-active/list/get-full/check-slug),
  `MembersController` (`/v1/organizations/:orgId/members`: list/add/remove/
  update-role/active/leave), invitation controllers (`/v1/organizations/:orgId/
invitations` + self-service `/v1/invitations/:id/accept|reject|cancel`, list),
  and `WorkspacesController` (`/v1/workspaces`: create/update/remove/set-active/
  list/mine/members/add-member/remove-member). New `admin` module —
  `/v1/admin/users` (list/get/create/update/set-role/ban/unban/impersonate/
  stop-impersonating/remove/sessions/revoke/set-password), gated by `manage User`;
  impersonation forwards Better Auth's `Set-Cookie`.

- **`@flama/shared`**: added request schemas/types for the above (check-slug,
  add-member, update-member-role, add-workspace-member, and body-only admin
  variants: create/update user, set-role, ban, set-password).

Run `pnpm generate:api-client` against a running API to regenerate the typed
client with the new endpoints.
