---
"@flama/frontend-consumer": minor
---

`organizationsKeys.members(orgId, filters)` puts its filters in one object at the end (`['organizations', 'members', orgId, { search?, roleIds? }]`, was a segment per facet). Invitations move under their own scope: `invitations(orgId)` is `['organizations', 'invitations', 'organization', orgId]` (was `['organizations', orgId, 'invitations']`), with `invitationsAll()` above it and `myInvitations()`. `useOrganizationMembers` and `useOrganizationInvitations` take `undefined` for an organization that isn't known yet and fetch with `skipToken`. `useRegister` also invalidates `profileKeys.me()`. Mutation hooks go through `withCacheOnSuccess`, so a caller's `onSuccess` no longer replaces their cache update.
