# Granular permissions

Flama has two authorization layers, and understanding the split is the key to
everything else on this page.

| Layer            | Governs                                    | Lives in                 |
| ---------------- | ------------------------------------------ | ------------------------ |
| **Roles** (CASL) | What a _person_ may do                     | The `role` table         |
| **Scopes**       | What a _credential_ may do on their behalf | The credential           |

A browser session carries no scopes: it can do whatever its owner's roles
allow. A scoped credential is additionally narrowed to the scopes it was
given, and the two are intersected on every request:

```
effective permissions = credential scopes ∩ owner's live CASL ability
```

Two consequences worth internalising:

- A credential can never be granted more reach than its owner has.
- Revoking someone's role immediately narrows every credential they issued —
  no need to hunt them down.

## The catalog

Permissions are grouped by resource, each with a **Read** and an **Edit**
level. Edit implies Read.

| Group               | Scopes                                 | Covers                                                   |
| ------------------- | -------------------------------------- | -------------------------------------------------------- |
| Profile             | `profile:read` `profile:write`         | The credential owner's own account                       |
| Users               | `users:read` `users:write`             | The user directory                                       |
| Roles & permissions | `roles:read` `roles:write`             | Role definitions and assignments                         |
| Organizations       | `organizations:read` `…:write`         | Organizations                                            |
| Members             | `members:read` `members:write`         | Organization membership and member roles                 |
| Invitations         | `invitations:read` `invitations:write` | Pending invitations                                      |
| Workspaces          | `workspaces:read` `workspaces:write`   | Workspaces (teams) and their members                     |
| Feature flags       | `flags:read` `flags:write`             | Flag targeting, kill switches and segments               |

The catalog is defined once, in `packages/shared/src/scopes/catalog.ts`, and is
consumed by the API guard and by whatever grants scopes. The groups above are
the starter's own. A plugin that adds a resource owns its row in the catalog
and every surface that renders it — its copy, its client, its routes.

## Resource scoping

On top of scopes, a credential can be pinned to specific organizations.
Leaving the list empty lets it follow the owner's memberships instead, which is
usually what you want — the credential keeps working as they join and leave
organizations.

A credential restricted to exactly one organization acts inside it by default,
so organization-bound routes resolve without an explicit id.

## Protecting an endpoint

Two decorators, and they answer different questions:

```ts
@Get()
@Version('1')
@CheckPolicies({ action: 'read', subject: 'User' })   // may this *person*?
@RequireScopes('users:read')                          // may this *credential*?
findAll() {}
```

`ScopesGuard` is registered globally and **fails closed**: a route that
declares no `@RequireScopes` cannot be called with a scoped credential at
all. New endpoints are therefore invisible to them until someone decides what
they should cost. Browser sessions are unaffected.

For organization-bound routes, name the parameter carrying the organization id
so the guard can enforce a credential's restriction:

```ts
@Get(':orgId/members')
@RequireScopes('members:read')
@OrganizationScoped('orgId')
list() {}
```

## Credentials

The starter ships the machinery and no scoped credential of its own: until one
is bound to `SCOPED_CREDENTIAL` (`apps/api/src/auth`), a bearer credential is a
session token or nothing. `pnpm plugin:add api-tokens` binds personal access
tokens, and the `mcp` plugin adds OAuth grants for MCP clients.

## Error codes

What any scoped credential can fail on (`CredentialErrors` in
`apps/api/src/auth/domain/auth.errors.ts`):

| Code        | Meaning                                                      |
| ----------- | ------------------------------------------------------------ |
| `TOKEN_003` | Invalid, revoked or expired credential (deliberately opaque) |
| `TOKEN_005` | Missing a scope the endpoint requires                        |
| `TOKEN_006` | The endpoint is not reachable with a scoped credential       |
| `TOKEN_007` | Outside the credential's organization restriction            |
