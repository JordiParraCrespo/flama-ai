# Flama — Authorization Model & Plan

> **Status:** design proposal. Nothing here is built yet beyond what the
> "Where Flama is today" section credits. This document rates the source model
> it is adapted from, then specifies the reusable engine and a phased plan.

Flama is a boilerplate. Whatever authorization it ships has to be **generic** —
the next project on top of it might be a CRM with leads, a WMS with warehouses,
or a support desk with queues. So the goal is not "add leads permissions"; it is
an **authorization kernel** that a new module plugs into by declaring metadata,
and gets tenant isolation, team scoping, row filtering, a role-builder UI entry,
an API-token scope, and a policy test harness for free.

---

## Part 1 — Rating the source model

The input (`AUTHORIZATION.md` from the Kalista project) is a good product
document and a weak framework spec. Scored as each:

| As…                                           | Score      | Why                                                                                                  |
| --------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| A product authorization design for one app    | **8 / 10** | Right decomposition, right call on the engine, honest about privacy/audit                            |
| A reusable, multi-module authorization kernel | **4 / 10** | The scoping dimension is hardcoded to one domain; no registry, no escalation control, no cache story |

### What it gets right — keep all of this

1. **The four-question decomposition (Q0–Q3) is the correct mental model.** It is
   the same split every serious system converges on: principal tier → tenant →
   resource set → capability. Naming them and asserting orthogonality is the
   single most valuable thing in the document.
2. **Demoting `member.role` from feature access to org administration.** This is
   the mistake most teams ship and never recover from — a three-tier enum
   metastasizing into `if (role === 'admin' || role === 'manager')` across the
   codebase. Confining it to "may you administer the org?" is right.
3. **The three-way `user.role` / `member.role` / `user_role` naming
   reconciliation.** A genuine trap, well caught. Better Auth's admin plugin
   claims `user.role` for the _platform_ tier; the legacy RBAC reading of the
   same column means something else entirely. Documenting this prevents a real
   incident.
4. **"The engine already supports this; the work is catalog + scoping."** True,
   and it keeps the change additive.
5. **Non-negotiable audit + deliberate (not ambient) cross-tenant access.** The
   right posture for the platform tier, and cheap to keep possible if you funnel
   all cross-tenant reads through the scoping layer from day one.
6. **Presets as editable seed rows, not hardcoded roles.** Correct.

### What I would change — the six substantive gaps

**1. Q2 is hardcoded to one domain. This is the big one.**

`creator_assignment(organization_id, user_id, account_id)` solves exactly one
scoping axis. The second time you need it — leads by team, tickets by queue,
inventory by warehouse — you copy the table and the resolver, and now you have
two half-tested scoping systems. Q2 must be a **polymorphic grant plus a
resolver interface**, not a table named after a domain noun.

**2. "Q2 is a query filter, not a CASL condition" is half right, and the wrong
half is the dangerous one.**

The doc is correct that set-membership over ids is awkward as a CASL condition.
But making it _only_ a query filter means enforcement lives in every query the
team ever writes. That is opt-in security: one forgotten `WHERE` is a
cross-team data leak, and nothing fails loudly. It also makes `ability.can()`
lie — the UI thinks the user can read a lead they cannot actually fetch.

The fix is not to pick one. It is to declare the scope **once** and derive
both: a CASL condition (so `can()` is truthful) and a SQL predicate applied by
a scoped repository base (so forgetting is impossible, and a scoped repository
queried without a scope throws in dev).

**3. No permission-catalog registry.**

The doc puts a fat `KNOWN_SUBJECTS` / `KNOWN_ACTIONS` literal in the shared
package. That does not scale across modules: every new feature edits one central
file, module boundaries leak into shared, and in Flama's case it also grows the
web bundle (the root CLAUDE.md already bans runtime imports from the
`@flama/shared` root for exactly this reason). The catalog should be
**contributed by modules at boot** and served over HTTP.

**4. Nothing about who may grant what.**

An org admin handed a role-builder can mint themselves `manage all`. Every
enterprise system needs the "no privilege escalation" invariant. Flama already
solves the analogous problem for credentials (`grantableScopes` — a token can
never exceed its creator); roles need the identical rule and the doc does not
mention it.

**5. No caching or invalidation story.**

Resolving an ability is already two DB round-trips per request. Add org-scoped
roles and assignment resolution and it is four, on every request, forever. Needs
a per-request memo plus a version-keyed cache invalidated on role writes.

**6. No hierarchy seam.**

Flat assignment cannot express "a manager sees their reports' leads" or
"region → territory → team". You do not have to build it, but you should leave
the seam — a scope resolver that returns a _set_ of team ids can be swapped for
one that walks a tree without touching a single call site.

### Smaller notes

- **Deny precedence is unspecified.** CASL is last-rule-wins. Union several roles
  and an `inverted` deny in role A can be silently overridden by role B depending
  on iteration order. Sort denies last, and pin it with a test.
- **The open question on "creator scope inside a role"** — the doc recommends
  keeping it separate. I would say: expressible in a role _condition_, but
  **populated from the assignment table**, never hand-authored. One source of
  truth, and `can()` stays truthful (see gap 2).
- **Field-level depth for MVP** — agree with the doc: start at subject+action,
  add `fields` where a real need exists. The engine already supports it.
- **Adopting the Better Auth `admin` plugin for the platform tier** — for Flama
  this is already done; see below.

---

## Part 2 — Where Flama is today

Credit where due: a good half of Q1 and Q3 already exists.

| Piece                                                                                 | State                      | Location                                                     |
| ------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------ |
| CASL rule shape (`action`/`subject`/`conditions`/`fields`/`inverted`)                 | **Done**                   | `packages/shared/src/permissions/index.ts`                   |
| `${...}` placeholder interpolation (`user.*`, `activeOrganizationId`, `activeTeamId`) | **Done**                   | same                                                         |
| DB-backed roles + `user_role` join, admin-managed CRUD                                | **Done**                   | `apps/api/src/roles/`                                        |
| `PoliciesGuard` + `@CheckPolicies`, ability on `request.ability`                      | **Done**                   | `apps/api/src/auth/guards/policies.guard.ts`                 |
| Credential scopes (`@RequireScopes`, catalog, `grantableScopes`)                      | **Done, and fails closed** | `packages/shared/src/scopes/`, `auth/guards/scopes.guard.ts` |
| Platform tier (Better Auth `admin` plugin, `superadmin`, impersonation)               | **Done**                   | `apps/api/src/auth/auth.ts`, `apps/api/src/admin/`           |
| Orgs, members, teams(=workspaces), `session.activeOrganizationId` / `activeTeamId`    | **Done**                   | `apps/api/src/organizations/`                                |
| Admin-lockout protection on `manage all`                                              | **Done**                   | `RoleEntity.grantsFullAccess`                                |

### And the gaps, precisely

| Gap                                                   | Detail                                                                                                                                                                                                                                  |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Roles are global, not org-scoped**                  | `role.name` is `unique` across the whole table and `user_role` has no `organizationId`. Two tenants cannot both have a "manager" role, and a role granted in org A applies in org B. **This is the blocking defect for multi-tenancy.** |
| **`PoliciesGuard` fails open**                        | `if (!rules) return true` — a route with no `@CheckPolicies` is reachable by any authenticated session. `ScopesGuard` fails closed; the two layers disagree, and the safe-by-default one is not the policy layer.                       |
| **No row-level enforcement**                          | `conditions` are interpolated and attached to the ability, but nothing applies them to a query. Every handler must remember `ability.can('read', subject('Lead', row))` by hand.                                                        |
| **No scope dimension beyond org/team-on-the-session** | There is no way to say "this user, these specific leads".                                                                                                                                                                               |
| **`KNOWN_SUBJECTS` is a hardcoded 11-entry literal**  | Adding a module means editing shared.                                                                                                                                                                                                   |
| **Two disconnected catalogs**                         | `SCOPE_RESOURCES` (credential scopes) and `KNOWN_SUBJECTS` (CASL subjects) are maintained by hand, side by side, and must be kept consistent or a new endpoint is invisible to API tokens.                                              |
| **No grant-safety on roles**                          | `grantableScopes` protects token minting; nothing stops a user with `update Role` from writing `manage all` onto a role and assigning it to themselves.                                                                                 |
| **Ability rebuilt per request, uncached**             | Two queries minimum, four callers of `AbilityFactory` in the request path.                                                                                                                                                              |

---

## Part 3 — The target model

Same four questions, but every dimension is a **declared interface**, not a
domain table.

| #      | Question               | Mechanism                                                                     | Generic?                     |
| ------ | ---------------------- | ----------------------------------------------------------------------------- | ---------------------------- |
| **Q0** | Platform operator?     | Better Auth `admin` plugin + `@PlatformAdmin()` short-circuit, always audited | yes                          |
| **Q1** | Which tenant's data?   | `organizationId` on every row + active-org context                            | yes                          |
| **Q2** | Which slice within it? | **`AccessScope`** = structural (team membership) ∪ explicit (`access_grant`)  | **yes — this is the change** |
| **Q3** | What may you do to it? | dynamic CASL RBAC, org-scoped roles                                           | yes                          |

All four must pass. Q0 short-circuits above the rest.

### 3.1 The resource registry — modules declare, the kernel derives

One declaration per resource, colocated with the module that owns it:

```ts
// apps/api/src/leads/leads.resource.ts
export const LeadResource = defineResource({
  subject: "Lead",
  label: "Leads",
  group: "crm",
  actions: [
    { name: "read", label: "View leads" },
    { name: "create", label: "Create leads" },
    { name: "update", label: "Edit leads" },
    { name: "assign", label: "Reassign owner" },
    { name: "export", label: "Export to CSV", sensitive: true },
  ],
  // Field-level grants the role-builder can offer (CASL `fields`).
  fields: ["value", "ownerId", "notes"],
  // How this resource carries the scope keys. THIS is what makes both the CASL
  // condition and the SQL predicate derivable from one place.
  keys: {
    organization: "organizationId",
    team: "teamId",
    owner: "ownerId",
  },
  // Which scope dimensions are meaningful here.
  scopes: ["organization", "team", "own", "grant"],
  // Optional: the credential-scope group this resource belongs to, so the
  // API-token catalog is generated rather than hand-maintained.
  credentialScope: "leads",
});
```

Registered with `AuthzModule.forFeature([LeadResource])`. A `ResourceRegistry`
collects them at boot and that single collection feeds:

- `GET /v1/authz/catalog` → the role-builder UI (no shared-package bundle cost);
- validation of submitted permissions (unknown subject ⇒ a **warning** on the
  response, never a hard rejection — the catalog stays advisory, admins may
  still store any string, exactly as today);
- the credential-scope catalog (`SCOPE_RESOURCES` becomes derived);
- seeding of preset roles;
- the scope engine's key mapping (below);
- the policy-coverage test.

`KNOWN_SUBJECTS`/`KNOWN_ACTIONS` in `@flama/shared` shrink to the kernel's own
subjects (`User`, `Role`, `Organization`, …) and stop being the extension point.

### 3.2 `AccessScope` — Q2, generalized

```ts
interface AccessScope {
  userId: string;
  organizationId: string | null;
  /** Teams (workspaces) the caller belongs to in the active org. */
  teamIds: string[];
  /** Explicit grants, per resource type: a set of ids, or 'all'. */
  grants: ReadonlyMap<string, ReadonlySet<string> | "all">;
  /** Q0 / `manage all` — skip scoping entirely. Audited when true. */
  bypass: boolean;
}
```

Two sources, composed by a `ScopeResolver`:

1. **Structural** — free, no new tables: the caller's `member` row gives the
   active org, `teamMember` gives `teamIds`. This alone answers the motivating
   case ("this team only sees its own leads") with zero new schema.
2. **Explicit** — one generic table, for when membership is not the right axis:

   ```sql
   access_grant (
     id              uuid primary key,
     organization_id uuid not null,
     principal_type  varchar not null,   -- 'user' | 'team' | 'role'
     principal_id    uuid    not null,
     resource_type   varchar not null,   -- 'Lead' | 'Warehouse' | …
     resource_id     uuid,               -- null = every resource of that type
     granted_by      uuid not null,
     expires_at      timestamptz,
     created_at      timestamptz not null
   )
   ```

   This is the polymorphic generalization of `creator_assignment`. One table
   covers "chatter → assigned creators", "rep → named accounts", "auditor → one
   warehouse", with `expires_at` for time-boxed access — a requirement that
   shows up in every enterprise deal and is nearly free here.

`ScopeResolver` is an interface with a default implementation. Swapping in one
that walks a manager/territory tree is a provider override — no call site
changes. That is the hierarchy seam.

### 3.3 One declaration, two enforcement points

**a) CASL conditions** gain scope placeholders, interpolated from `AccessScope`:

```ts
{ action: 'read', subject: 'Lead',
  conditions: { teamId: { $in: '${scope.teamIds}' } } }

{ action: 'update', subject: 'Lead',
  conditions: { ownerId: '${user.id}' } }

{ action: 'read', subject: 'Lead',
  conditions: { id: { $in: '${scope.grants.Lead}' } } }
```

An array-valued placeholder inside `$in` is a small extension to the existing
`interpolateConditions` walker. `can()` now tells the truth, so the UI can hide
what the user cannot reach.

**b) A SQL predicate**, generated from the _same_ registry `keys` metadata:

```ts
// in a query handler
const qb = this.repo.createQueryBuilder("lead");
applyAccessScope(qb, LeadResource, scope); // appends the WHERE
```

and, better, folded into a `ScopedRepositoryBase` in `@flama/backend-ddd` so a
module gets it by default. **A repository declared scoped that is queried
without a scope throws** — in dev and test loudly, in production it fails
closed. That is the answer to "one forgotten `WHERE`".

**c) Instance-level checks** stop being hand-written:

```ts
@Patch(':id')
@CheckPolicies({ action: 'update', subject: 'Lead' })   // type level
@AuthorizeResource({ subject: 'Lead', param: 'id' })    // instance level
update() {}
```

An interceptor loads the row through a registered loader and runs
`ability.can(action, subject('Lead', row))`. **A row outside scope returns 404,
not 403** — consistent with the existing api-token convention, so ids cannot be
probed.

### 3.4 Org-scoped roles (Q1) — the blocking change

- `role.organization_id` nullable; `null` = global system template.
- Drop the global unique on `name`; unique on `(organization_id, name)`, plus a
  partial unique index on `name where organization_id is null`.
- `user_role.organization_id` — a user's roles differ per org.
- `AbilityFactory.createForUser(user, { organizationId })` unions global roles
  with roles scoped to the active org.
- Active org comes from `session.activeOrganizationId`, overridable by an
  `X-Active-Organization` header **validated against the caller's memberships**
  (a header the server trusts blindly is a tenant-isolation hole).
- Migration backfills existing rows with `organization_id = null`, so today's
  behaviour is unchanged until roles are explicitly scoped.

### 3.5 Grant safety — no privilege escalation

`canGrant(actorAbility, permission)`: an actor may only place a rule on a role
if their own ability already satisfies it. Applied in `CreateRole`,
`UpdateRole`, `UpdateRolePermissions` and `AssignUserRoles`. Mirrors
`grantableScopes` exactly, so the invariant is stated once conceptually and
enforced in both places. Existing `ADMIN_LOCKOUT` protection stays. Org-scoped
role editors can never touch `organization_id IS NULL` roles.

### 3.6 Deny precedence

Denies (`inverted: true`) are sorted last when building the ability, across the
union of all roles, so a `cannot` in one role is never silently overridden by a
`can` in another. Pinned by a test. Documented in `rbac-roles.md`.

### 3.7 Audit

An `audit_log` table + an interceptor recording: actor, tenant, action, subject,
resource id, decision, and **whether a bypass was used**. Written for every
platform-admin action, every impersonated request, and every role/grant
mutation. Authorization _denials_ are logged at a sampled rate — useful signal,
but not at the cost of a write per probe.

### 3.8 Performance

- **Per-request memo.** `AbilityFactory` is called from `PoliciesGuard` and three
  api-token handlers; memoize on the request so one request builds one ability.
- **Version-keyed cache.** `authz:v{orgRoleVersion}:{userId}:{orgId}` in Redis.
  Any role/assignment/grant write bumps the org's `roleVersion` through the
  existing outbox → no explicit invalidation fan-out, no stale-permission window
  worth worrying about. Revoking a role still takes effect on the next request,
  which is the property the scopes rules already promise.

---

## Part 4 — Where the code lives

A new package, following the repo's own rule that reusable backend
infrastructure belongs in `packages/backend/*`:

```
packages/backend/authz/          # @flama/backend-authz  (library package)
├── registry/       defineResource, ResourceRegistry
├── scope/          AccessScope, ScopeResolver (interface + default), applyAccessScope
├── ability/        buildAbility, placeholder interpolation, deny ordering
├── guards/         PoliciesGuard, PlatformAdminGuard, AuthorizeResource interceptor
├── grants/         canGrant
└── testing/        expectAbility(...) harness
```

`@flama/shared` keeps only the **wire contracts** (`PermissionDefinition`, the
Zod schemas, the catalog response type) — nothing that drags CASL into the web
bundle. `apps/api` keeps only the app-specific wiring: the Better Auth
integration, the `roles` module, and the `access_grant` persistence.

---

## Part 5 — Phased plan

Each phase ships independently, is behaviour-preserving unless noted, and ends
green.

### Phase 0 — Foundations (no behaviour change)

- [ ] Create `@flama/backend-authz`; move the ability builder, `PoliciesGuard`
      and `@CheckPolicies` into it, re-exported from their current paths.
- [ ] `defineResource` + `ResourceRegistry` + `AuthzModule.forFeature`.
- [ ] Register the kernel's existing subjects (`User`, `Role`, `Organization`,
      `Workspace`, `Member`, `Invitation`, `ApiToken`, `Billing`, `AuditLog`).
- [ ] `GET /v1/authz/catalog`.
- [ ] Per-request ability memo.
- [ ] Deny-ordering + its test.
- [ ] **Close the fail-open hole:** a test that enumerates every route and
      asserts each declares `@CheckPolicies` or an explicit `@NoPolicy()`.
      Convert the guard to fail closed once the list is clean.

### Phase 1 — Tenancy (Q1)

- [ ] Migration: `role.organization_id`, `user_role.organization_id`, index
      changes, backfill to `null`.
- [ ] `AbilityFactory` resolves per active org.
- [ ] `X-Active-Organization` header, validated against memberships.
- [ ] Version-keyed ability cache, invalidated via the outbox.
- [ ] Role endpoints become org-aware; global roles editable by platform admins
      only.

### Phase 2 — The scoping engine (Q2) — _the reusable core_

- [ ] `AccessScope` + `ScopeResolver` (structural: org + teams).
- [ ] `access_grant` table + resolver contribution + admin endpoints.
- [ ] `${scope.*}` placeholders, including array `$in`.
- [ ] `applyAccessScope` + `ScopedRepositoryBase`; unscoped-query guard rail.
- [ ] `@AuthorizeResource` interceptor, 404-on-out-of-scope.
- [ ] `expectAbility` test harness.

### Phase 3 — Governance (Q0 + safety)

- [ ] `canGrant` across all four role-mutating use cases.
- [ ] `audit_log` + interceptor; impersonated requests inherit the target's
      scope (never `bypass`) and are always audited.
- [ ] `@PlatformAdmin()` guard formalized as the Q0 short-circuit.

### Phase 4 — Surfaces

- [ ] Role-builder UI in `apps/web`: permission matrix by group, field-level
      toggles, scope selector — driven entirely by `/v1/authz/catalog`.
- [ ] Credential-scope catalog generated from the registry; `SCOPE_RESOURCES`
      becomes derived, and a new resource is reachable by API tokens and MCP
      without a second hand-edit.
- [ ] `flama` CLI + MCP pick the generated catalog up for free.
- [ ] Docs: rewrite `.agents/rules/rbac-roles.md`, add
      `apps/docs/docs/architecture/authorization.md`.
- [ ] **A worked reference module (`leads`)** — team-scoped rows, an explicit
      grant case, field-level hiding, and an end-to-end test proving a member of
      team A cannot read team B's leads through _any_ route. This is both the
      proof the kernel is reusable and the copy-paste template for the next
      module.

### Deliberately out of scope

ReBAC / Zanzibar-style relation tuples, an external policy engine (OPA/Cedar),
and per-request policy compilation. Flama's tenant counts do not justify them,
and the registry keeps the door open: `ScopeResolver` and the ability builder
are the two seams an external engine would replace.

---

## Part 6 — Answers to the source doc's open questions

| Question                                             | Answer for Flama                                                                                                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope inside a role, or a separate assignment table? | **Both, one source of truth.** Expressed as a role condition via `${scope.*}`, populated from `AccessScope` — never hand-authored. Keeps `can()` truthful without duplicating the data.                 |
| Field-level depth for MVP?                           | Subject + action first. `fields` is already supported end-to-end; the registry declares which fields the UI may offer, so adding it later is a data change.                                             |
| Platform tier?                                       | Already adopted in Flama (Better Auth `admin` plugin, `superadmin`, impersonation). Phase 3 adds the `audit_log` and formalizes the guard. `user.role` stays the platform role only.                    |
| Action naming — domain verbs?                        | Agreed, with one rule: `manage` stays reserved as CASL's wildcard, and every custom verb is declared in the registry so it appears in the role-builder instead of being a string only its author knows. |
