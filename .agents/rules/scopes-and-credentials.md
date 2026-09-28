---
paths:
  - "apps/api/**/*"
  - "packages/shared/**/*"
---

# Scopes & Credentials Rules

Authorization has **two layers**, and they answer different questions:

| Layer        | Question                       | Enforced by                        |
| ------------ | ------------------------------ | ---------------------------------- |
| Roles (CASL) | May this **person** do it?     | `PoliciesGuard` + `@CheckPolicies` |
| Scopes       | May this **credential** do it? | `ScopesGuard` + `@RequireScopes`   |

```
effective permissions = credential scopes ∩ owner's live CASL ability
```

A browser session carries no scopes and is governed by roles alone. A scoped
credential is additionally narrowed. Two properties fall out of this and must
not be broken:

- a credential can never be granted more reach than its owner has
  (`grantableScopes` in `@flama/shared`, enforced wherever one is issued);
- revoking a role instantly narrows every credential that user issued, because
  the ability is rebuilt per request, never cached into the credential.

## The catalog is the single source of truth

`packages/shared/src/scopes/catalog.ts` defines the permission groups, each
with a Read and an Edit level. **Add a resource there and nowhere else** — the
API guard and whatever grants scopes both read from it, and so does every
client a credential is handed to: a scope removed from it breaks them all.

- `write` implies `read` on the same resource (`expandScopes`). Never grant both
  explicitly; grant `write`.
- Each level lists the CASL rules that back it. That list is what decides
  whether a user may grant the level.
- Privileged account operations (ban, impersonate, set-password, revoke
  sessions) belong to the `admin` group, **not** `users`. Keep them apart: a
  credential that manages the directory must not be able to take over accounts.

## Protecting an endpoint

Every new route needs both decorators:

```ts
@Get()
@Version('1')
@CheckPolicies({ action: 'read', subject: 'User' })
@RequireScopes('users:read')
findAll() {}
```

`ScopesGuard` is global and **fails closed**: a route with no `@RequireScopes`
throws `TOKEN_006` for any scoped credential. Forgetting the decorator makes an
endpoint invisible to scoped credentials — it never makes it accidentally
reachable.

Organization-bound routes must also declare which parameter carries the
organization id, or a restricted credential could reach another organization:

```ts
@Get(':orgId/members')
@RequireScopes('members:read')
@OrganizationScoped('orgId')
list() {}
```

Use `@AllowAnyScope()` only for routes that expose nothing but the caller's own
identity or data already served to anonymous callers (in the starter, the
`GET /health/capabilities` probe).

## Credential handling

The starter accepts sessions only. A scoped credential is a module that binds
`SCOPED_CREDENTIAL` (`ScopedCredentialPort` in `apps/api/src/auth`): the
resolver asks it whether it recognises a bearer secret, and for the scope
context the secret grants. Whatever implements the port holds to these:

- A secret is **only** ever stored as a digest. Never log a secret, never put
  one in a cache key, never add an endpoint that returns one after creation.
- Authentication failures share one opaque error (`TOKEN_003`,
  `CredentialErrors`) whether the credential is unknown, revoked or expired —
  distinguishing them hands out a probing oracle. Authorization failures are
  specific, because the caller already proved who they are and needs to know
  what they are short of.
- Someone else's credential is reported as **not found**, not forbidden, so
  ids cannot be probed.
- Revocation drops the cached delegated session (`DELEGATED_SESSION`) so it
  takes effect immediately, from a handler of the module's own revocation
  event.

## Delegated sessions

Façade modules (organizations, members, invitations, workspaces, admin) call
`auth.api.*`, which resolves the caller from a Better Auth session. Scoped
credentials have none, so `ApiAuthGuard` mints a short-lived session for the
owner and rewrites `Authorization` to it (accepted thanks to the `bearer`
plugin). It is cached per credential for ten minutes.

If you add a façade that calls `auth.api.*` with the incoming headers, this
already works. If you bypass the guard, it will not.
