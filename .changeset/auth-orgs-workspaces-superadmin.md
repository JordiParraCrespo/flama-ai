---
"@flama/shared": minor
"@flama/backend-email": minor
"@flama/api": minor
---

Add Better Auth admin (super-admin) and organization (with workspaces) plugins.

Authentication already ran on Better Auth; this enables its official `admin` and
`organization` plugins and wires them into the app, plus organization-scoped
CASL authorization.

- **`@flama/api`**: enable the `admin` plugin (super-admin: list/ban/impersonate
  users, set roles, revoke sessions — gated by the new `superadmin`/`admin`
  roles and `BETTER_AUTH_ADMIN_USER_IDS`) and the `organization` plugin
  (organizations, members, invitations, and **workspaces** via teams). New users
  get a personal organization + default workspace on sign-up; sessions carry
  `activeOrganizationId` / `activeTeamId`. Adds ORM entities + a migration for
  `organization`/`member`/`invitation`/`team`/`teamMember`, the admin columns
  (`user.banned`/`banReason`/`banExpires`, `session.impersonatedBy`), and a
  seeded `superadmin` system role. `PoliciesGuard`/`AbilityFactory` now thread
  `session.activeOrganizationId` into CASL so permissions can be org-scoped with
  `${activeOrganizationId}` conditions. System roles that grant `manage all` are
  protected from being stripped of it (admin-lockout guard).

- **`@flama/shared`**: new `superadmin` system role and `ORGANIZATION_ROLES`;
  new Zod schemas/types for organization, member, invitation, workspace, and
  admin operations; `activeOrganizationId` / `activeTeamId` added to the CASL
  ability context; new `Organization`/`Workspace`/`Member`/`Invitation`/
  `AuditLog` known subjects. Removes the vestigial `JwtPayload`, `TokenPair`,
  `AuthProvider` types and the unused `AUTH` token-expiry constants.

- **`@flama/backend-email`**: new `EmailService.sendInvitation` + invitation
  React Email template, sent asynchronously through the email queue.

After deploying, run the migration (`pnpm --filter @flama/api migration:run`).
The organization/admin operations are exposed to the frontend through the Better
Auth `organizationClient()` / `adminClient()` plugins (already wired into the web
and mobile auth clients), not the generated api-client.
