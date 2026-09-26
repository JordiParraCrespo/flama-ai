---
"@flama/frontend-consumer": major
"@flama/api": minor
"@flama/auth": minor
"@flama/web": minor
"@flama/mobile": minor
"@flama/mcp": patch
"@flama/e2e": patch
---

Organizations become an optional starter feature. Everything multi-tenant —
organizations, members, invitations, workspaces, access grants and the
onboarding that creates the first organization — is fenced as the
`organizations` feature: `pnpm starter:prune --without organizations` removes
it, and a project without it signs an account straight into the app with
global roles. It stays in the starter by default.

- `@flama/frontend-consumer`: the organization hooks and `organizationsKeys`
  move from `@flama/frontend-consumer/react` to their own subpath,
  `@flama/frontend-consumer/organizations`.
- `@flama/auth`: the organization client plugin is `organizationClientPlugin()`
  in its own module; `sharedClientPlugins()` includes it while organizations
  are installed.
- `@flama/api`: the Better Auth organization plugin and the active-organization
  session hook live in `organization-plugin.config.ts`; the access-grant
  mapper is `access-grant.mapper.ts`; the seed's organization is
  `database/seed-organization.ts`; API tokens read memberships with SQL rather
  than through the organizations module.
- `@flama/web` and `@flama/mobile`: the shell opens through a list of gates,
  and the workspace gate is the organizations feature's. The web build runs
  `vite build` before `tsc -b`, so a pruned route tree is regenerated before
  it is type-checked.
