---
"@flama/api": minor
"@flama/shared": minor
"@flama/api-client": minor
---

Add the `domains` module — tracked domains and per-member domain access.

This is the first slice of the CRM API. A domain is the attribution anchor the
rest of the CRM hangs off: leads will record the domain they were captured on
and search metrics will roll up per domain.

**`apps/api/src/domains/`** is a standard Domain-Driven Hexagon slice. The
`DomainEntity` aggregate owns a `Hostname` value object (bare hostnames only —
subdomains are tracked as separate domains) and the `draft` → `active` →
`paused` lifecycle. Connecting, changing status and removing a domain each raise
a domain event, staged on the transactional outbox by the repository so the
on-connect work (Search Console import, initial crawl) and the on-removal
cleanup cannot be lost.

**Per-instance access is a generic mechanism**, not a domains feature. The new
`access-control/` module owns a polymorphic `user_resource_access` table, a
single `ResourceAccessContributor` that turns stored rows into CASL `cannot`
rules, a listing-filter service and an instance-check helper. A feature module
opts in by registering a `RestrictableResource` — a resource type key and the
subjects the restriction narrows — so leads or campaigns get the same behaviour
without another table, contributor or helper. `domains` registers one and is
otherwise an ordinary consumer.

Access is **per-organization**: a user may be narrowed to three domains in one
organization and unrestricted in another, so the writes, the reads and the CASL
rules are all qualified by `organizationId`. Setting a user's access also
requires them to be a member of that organization.

Endpoints, all `@RequireScopes`-gated by the new `domains:read` / `domains:write`
scopes and `@CheckPolicies`-gated on the new `Domain` CASL subject:

| Method & path                   | Purpose                              |
| ------------------------------- | ------------------------------------ |
| `POST /v1/domains`              | Connect a domain                     |
| `GET /v1/domains`               | List domains (paginated, filterable) |
| `GET /v1/domains/:id`           | Get a domain                         |
| `PATCH /v1/domains/:id`         | Update protocol, owner or status     |
| `DELETE /v1/domains/:id`        | Stop tracking a domain               |
| `GET /v1/users/:userId/domains` | Read a user's domain access          |
| `PUT /v1/users/:userId/domains` | Replace a user's domain access       |

**Per-member domain access** ("All domains" vs "3 domains") is enforced through
the existing RBAC machinery rather than a parallel authorization path. A new
`user_domain_access` join records the restriction, and an `AbilityContributor`
turns it into `cannot` rules on the CASL ability `PoliciesGuard` already builds,
so every instance-level `ability.can(...)` check picks it up. Having no rows
means unrestricted, so existing users keep working without a backfill.

`AbilityContributor` / `AbilityContributorRegistry` (in the global roles module)
are a new extension point: feature modules register narrowing rules without
`roles/` importing them, which would be a cycle. Contributors may only narrow —
`AbilityFactory` drops any non-inverted rule they return, so a feature module
can never hand out access no role granted.

`AppAbility`'s subject type widens from `string` to CASL's `Subject`, so
resource-scoped checks (`can('read', subject('Domain', row))`) type-check
instead of requiring a cast. Rules are still _stored_ with a string subject;
only what a check may be passed changes. This also fixes pre-existing type
errors in `roles/__tests__/permissions.spec.ts`.
