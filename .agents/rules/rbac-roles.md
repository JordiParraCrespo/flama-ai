---
paths:
  - "apps/api/**/*"
  - "packages/shared/**/*"
---

# Roles & Authorization (RBAC) Rules

Authorization is **database-backed and admin-managed** (dynamic RBAC). Roles and
their permissions live in the `role` table (not in code); a user's effective
permissions are the **union of every role assigned to them** via the `user_role`
join. CASL turns those permissions into an ability that guards check.

Do **not** reintroduce a hardcoded role→permission switch. The legacy
`defineAbilitiesFor(role)` helper remains only as a fallback/ frontend
convenience — application authorization goes through the database.

## Where things live

| Concern                             | Location                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| Permission/ability building (CASL)  | `packages/shared/src/permissions` (`defineAbilitiesFromPermissions`)                        |
| Role Zod schemas                    | `packages/shared/src/schemas/role.schema.ts`                                                |
| Roles module (aggregate, use cases) | `apps/api/src/roles/`                                                                       |
| Effective-ability resolution        | `apps/api/src/roles/services/ability.factory.ts`                                            |
| Route guard + policy decorator      | `apps/api/src/auth/guards/policies.guard.ts`, `auth/decorators/check-policies.decorator.ts` |

## Data model

- **`RoleEntity`** (aggregate) — `name` (unique, immutable), `description`,
  `isSystem`, and `permissions: Permission[]` (a value object), persisted as a
  `jsonb` column on the `role` table.
- **`user_role`** — many-to-many join (`userId`, `roleId`); a user may hold
  several roles.
- **System roles** (`admin`, `user`) are seeded by the migration and **cannot be
  deleted or renamed** (`isSystem = true`). Their permissions can still be edited.
- `Role` (in `@flama/shared`) is a plain `string` — role names are dynamic.

## Permission shape

A permission is a CASL rule (`PermissionDefinition` in `@flama/shared`):

```ts
interface PermissionDefinition {
  action: string; // free-form, e.g. 'read' | 'create' | 'manage'
  subject: string; // free-form, e.g. 'User' | 'Article' | 'all'
  conditions?: Record<string, unknown>; // resource scoping (see below)
  fields?: string[]; // restrict to specific attributes
  inverted?: boolean; // turns the rule into a `cannot`
  reason?: string;
}
```

`action`/`subject` are **free-form strings** so admins can author permissions for
any resource. The well-known values live in `KNOWN_ACTIONS` / `KNOWN_SUBJECTS`
(convenience only — they do not constrain what can be stored). `manage` is CASL's
wildcard action; `all` is its wildcard subject (admins get `manage all`).

## Protecting an endpoint

Add the guards and a policy. The guard resolves the caller's ability from their
roles and checks the rule:

```ts
@UseGuards(AuthGuard, PoliciesGuard)
@Controller("articles")
export class PublishArticleHttpController {
  @Post(":id/publish")
  @Version("1")
  @CheckPolicies({ action: "update", subject: "Article" })
  async publish(/* ... */) {}
}
```

- `AuthGuard` (Better Auth) authenticates and populates `request.user`.
- `PoliciesGuard` builds the ability via `AbilityFactory.createForUser(user)`
  (union of the user's roles' permissions, falling back to the legacy
  `user.role`), checks every `@CheckPolicies` rule, and attaches the built
  ability to `request.ability`.
- No `@CheckPolicies` ⇒ any authenticated user passes (e.g. `GET /users/me`).

### Resource scoping (own-resource checks)

The guard only checks **action + subject** (type level) — it does not see the
concrete entity. For "only your own X" rules, store a condition with a
`${...}` placeholder and enforce it in the handler against the loaded entity:

```ts
// permission stored on a role:
{ action: 'update', subject: 'Article', conditions: { authorId: '${user.id}' } }

// in the handler, using the ability the guard attached:
import { subject } from '@casl/ability';
if (!request.ability.can('update', subject('Article', article))) {
  throw new ForbiddenException();
}
```

`${user.id}` (any `user.*` path) is interpolated from the authenticated principal
when the ability is built.

### Per-instance access ("only these three domains")

Some restrictions cannot be a static role permission because they name concrete
rows. That is **`access-control/`**, and it is generic over the resource type —
a feature module registers, it does not build its own table or contributor:

```ts
// domains/services/domain-restrictable-resource.ts
export const DOMAIN_RESOURCE_TYPE = 'domain';

registry.register({
  type: DOMAIN_RESOURCE_TYPE,
  // Restricting someone to three domains must also keep them out of every
  // other domain's leads, so child subjects list the field that points back.
  scopedSubjects: [
    { subject: 'Domain', field: 'id' },
    { subject: 'Lead', field: 'domainId' },
  ],
});
```

That registration buys the module all of:

- **Storage** — `user_resource_access (userId, resourceType, resourceId, organizationId)`.
  `resourceId` is polymorphic so it has **no foreign key**; the owning module
  revokes grants from its removal event handler (`ResourceAccessService.revokeResource`),
  or an orphaned row can hand a recycled id an old grant.
- **CASL narrowing** — one `ResourceAccessContributor` turns stored rows into
  `cannot` rules on the ability `PoliciesGuard` already builds, so every
  instance-level `ability.can(...)` picks them up.
- **The listing filter** — `ResourceAccessService.allowedIds(...)` returns
  `undefined` when unrestricted and an id list otherwise. Filter the query with
  it (`WHERE id IN (...)`); do not post-filter a page, or `total` and page sizes
  start lying.
- **The instance check** — `canReachResource(ability, action, subject, row)`.
  Wrap it to raise your module's own error code.

Two invariants worth not breaking:

- **No rows means unrestricted**, per organization and resource type. An empty
  array means "allowed nothing" — the opposite. `ResourceAccessService` holds
  that distinction so call sites cannot get it backwards.
- **Rules are qualified by `organizationId`**, and the tagged subject must carry
  it. A user narrowed in one organization is unrestricted in another; an
  unqualified rule would deny them everything everywhere.

### Narrowing an ability from a feature module (`AbilityContributor`)

`access-control/` is itself built on a lower-level extension point, which you
only need directly for a restriction that per-instance access does not model.

`AbilityContributor` (`roles/services/ability-contributor.ts`) lets a module add
rules to the caller's ability without `roles/` importing it — that would be a
cycle, since every feature module already depends on the global roles module. A
contributor registers itself with the `AbilityContributorRegistry` from its own
`onModuleInit`; `AbilityFactory` calls every contributor when it builds an
ability, appending their rules after the role-derived ones so a `cannot` wins.

**Contributors may only narrow.** Return `inverted` rules — express the
restriction as "cannot touch anything outside my list"
(`conditions: { id: { $nin: allowed } }, inverted: true`), never as a permissive
`$in`. `AbilityFactory` drops any non-inverted rule a contributor returns: a
feature module must not be able to hand out access no role granted.

## Managing roles & assignments (admin-only API)

| Method & path                   | Purpose                                    |
| ------------------------------- | ------------------------------------------ |
| `POST /v1/roles`                | Create a custom role                       |
| `GET /v1/roles`                 | List roles (paginated, `?search=`)         |
| `GET /v1/roles/:id`             | Get a role                                 |
| `PATCH /v1/roles/:id`           | Update description and/or permissions      |
| `PUT /v1/roles/:id/permissions` | Replace a role's permission set (granular) |
| `DELETE /v1/roles/:id`          | Delete a custom role (system roles 403)    |
| `GET /v1/users/:userId/roles`   | List a user's assigned roles               |
| `PUT /v1/users/:userId/roles`   | Replace a user's assigned roles            |

Role endpoints are gated by `Role` policies (`create`/`read`/`update`/`delete`);
assignment endpoints by `manage User`. New sign-ups are assigned the default
`user` role; the migration seeds the system roles and backfills existing users
from the legacy `user.role` column.

## Wiring notes

- `RolesModule` is `@Global` so the `AbilityFactory` (needed by `PoliciesGuard`
  in every feature module) and the repository ports are available app-wide
  without circular module imports.
- The roles module follows the standard DDD-Hexagon layout
  (`nestjs-architecture.md`); permission editing goes through domain methods
  (`RoleEntity.replacePermissions`), never by mutating ORM records directly.
- After changing role/assignment endpoints, run `pnpm generate:api-client` and
  add a changeset.

## Organizations, workspaces & super-admin (Better Auth plugins)

Multi-tenancy and super-admin are provided by Better Auth's **`admin`** and
**`organization`** plugins, configured in `apps/api/src/auth/auth.ts`. Their
endpoints live under `/api/auth/*` (not NestJS controllers), so the frontend
calls them through the `adminClient()` / `organizationClient()` client plugins,
**not** the generated api-client.

- **Super-admin** — the `admin` plugin (`adminRoles: ['superadmin','admin']`)
  gates `/api/auth/admin/*` (list/ban/impersonate/set-role) by the user's `role`
  column. A `superadmin` system role is seeded; `BETTER_AUTH_ADMIN_USER_IDS`
  bootstraps break-glass super admins by id. This is **separate** from CASL: CASL
  still governs the app's own REST routes.
- **Two role stores, kept in sync** — the admin plugin's `set-role` writes the
  single `user.role` column; the app's dynamic RBAC lives in the `user_role`
  join. `AbilityFactory` builds the CASL ability from the **union** of both (the
  join roles _and_ the `user.role` column's role), so an admin-plugin promotion
  flows into CASL and vice-versa. Fine-grained per-role permissions still come
  from `user_role` (assign via `PUT /v1/users/:userId/roles`); `user.role` is a
  single system-role name for admin-plugin gating.
- **Organizations / members / invitations** — the `organization` plugin owns the
  `organization`, `member`, `invitation` tables. New users get a personal org +
  default workspace on sign-up (`databaseHooks.user.create.after`); the session
  carries `activeOrganizationId` / `activeTeamId`. Invitation emails go through
  the BullMQ email queue (`EmailService.sendInvitation`).
- **First-class REST façade** — `apps/api/src/organizations/` and
  `apps/api/src/admin/` expose the plugin operations as typed, Swagger-documented,
  CASL-guarded endpoints (`/v1/organizations`, `/v1/organizations/:id/members`,
  `/v1/organizations/:id/invitations` + `/v1/invitations`, `/v1/workspaces`,
  `/v1/admin/users`) so they land in the generated `@flama/api-client`. These are
  **delegating façades**: the controllers/services call `auth.api.*` (via
  `auth/better-auth.util.ts` — `betterAuthHeaders` + `invokeBetterAuth`) rather
  than writing the tables, so Better Auth stays the single source of truth. They
  are infrastructure modules (controller → injectable service → `auth.api`), not
  CQRS/domain slices, since there is no app-owned aggregate. Impersonation
  forwards Better Auth's `Set-Cookie` to the client.
- **Workspaces = teams** — modelled on the org plugin's teams feature
  (`team` / `teamMember`).
- **Org-scoped CASL** — `PoliciesGuard` reads `session.activeOrganizationId` and
  passes it to `AbilityFactory.createForUser(user, scope)`. Scope tenant
  resources with a condition placeholder:
  `{ action: 'read', subject: 'Article', conditions: { organizationId: '${activeOrganizationId}' } }`,
  then enforce per-row in the handler via `request.ability.can('read', subject('Article', row))`.
- **Lockout protection** — a system role that grants `manage all` cannot have
  that rule removed (`RoleErrors.ADMIN_LOCKOUT`, enforced in the update-role
  command handlers via `RoleEntity.grantsFullAccess`).
