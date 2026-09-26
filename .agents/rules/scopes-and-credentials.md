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

A browser session carries no scopes and is governed by roles alone. An API
token or OAuth grant is additionally narrowed. Two properties fall out of this
and must not be broken:

- a token can never be minted with more reach than its creator has
  (`grantableScopes` in `@flama/shared`, enforced in `CreateApiTokenService`);
- revoking a role instantly narrows every credential that user issued, because
  the ability is rebuilt per request, never cached into the token.

## The catalog is the single source of truth

`packages/shared/src/scopes/catalog.ts` defines the permission groups, each
with a Read and an Edit level. **Add a resource there and nowhere else** — the
API guard, the MCP tool registry, the CLI and the web permission picker all
read from it.

- `write` implies `read` on the same resource (`expandScopes`). Never grant both
  explicitly; grant `write`.
- Each level lists the CASL rules that back it. That list is what decides
  whether a user may grant the level.
- Privileged account operations (ban, impersonate, set-password, revoke
  sessions) belong to the `admin` group, **not** `users`. Keep them apart: a
  token that manages the directory must not be able to take over accounts.

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
endpoint invisible to tokens — it never makes it accidentally reachable.

Organization-bound routes must also declare which parameter carries the
organization id, or a restricted token could reach another organization:

```ts
@Get(':orgId/members')
@RequireScopes('members:read')
@OrganizationScoped('orgId')
list() {}
```

Use `@AllowAnyScope()` only for routes that expose nothing but the caller's own
identity or data already served to anonymous callers (currently
`GET /v1/me/credential` and the `GET /health/capabilities` probe).

## Credential handling

- Token secrets are **only** ever stored as a SHA-256 digest. Never log a
  secret, never put one in a cache key (`credentialId` for OAuth is a digest
  prefix for exactly this reason), never add an endpoint that returns one after
  creation.
- Authentication failures share one opaque error (`TOKEN_003`) whether the
  token is unknown, revoked or expired — distinguishing them hands out a
  probing oracle. Authorization failures are specific, because the caller
  already proved who they are and needs to know what they are short of.
- Someone else's token is reported as **not found**, not forbidden, so ids
  cannot be probed.
- Revocation raises `ApiTokenRevokedDomainEvent`; the auth layer listens and
  drops the cached delegated session so it takes effect immediately. Do not
  call the auth layer from the api-tokens module directly — that is what the
  event is for.

## Delegated sessions

Façade modules (organizations, members, invitations, workspaces, admin) call
`auth.api.*`, which resolves the caller from a Better Auth session. Scoped
credentials have none, so `ApiAuthGuard` mints a short-lived session for the
owner and rewrites `Authorization` to it (accepted thanks to the `bearer`
plugin). It is cached per credential for ten minutes.

If you add a façade that calls `auth.api.*` with the incoming headers, this
already works. If you bypass the guard, it will not.

## The MCP server and the CLI

Neither is in this repo: they are the `mcp` and `cli` plugins
(`pnpm plugin:add mcp`, `pnpm plugin:add cli`), and their rules travel with
them in `apps/mcp/AGENTS.md` and `apps/cli/AGENTS.md`. The `mcp` plugin also
makes the API an OAuth provider — Better Auth's MCP plugin, bound behind
`OAUTH_GRANT_VERIFIER` — and adds the consent screen. What stays true here is
the contract they consume: the scope catalog above is what a credential is
scoped against, so a scope removed from `packages/shared/src/scopes/` breaks
installed MCP clients and CLIs alike, and an MCP tool declares the same scope
its endpoint's `@RequireScopes` does.
