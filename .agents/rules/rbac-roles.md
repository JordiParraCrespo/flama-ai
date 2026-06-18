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

## Adding a new protected resource

1. Pick a `subject` string (e.g. `'Invoice'`) and annotate the endpoints with
   `@CheckPolicies({ action, subject })`.
2. Optionally add it to `KNOWN_SUBJECTS` in `@flama/shared` for discoverability.
3. Grant access by adding permissions to a role through the API — **no code
   change is needed to authorize a role**. Admins (`manage all`) pass by default.

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
