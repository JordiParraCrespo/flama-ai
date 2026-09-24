---
"@flama/frontend-consumer": minor
---

`organizationsKeys` has one function per level. Members: `members()` (`MEMBER_LISTS_KEY`, unchanged) → `memberLists()` → `memberList(orgId, filters)`, which replaces `members(orgId, filters)` and `membersAll()`; the key is `['organizations', 'members', 'list', orgId, { search?, roleIds? }]`. Invitations: `invitations()` → `invitationLists()` → `invitationList(orgId)`, which replaces `invitations(orgId)` (was `['organizations', orgId, 'invitations']`), plus `myInvitations()` under `invitations()`. `useOrganizationMembers` and `useOrganizationInvitations` take `undefined` for an organization that isn't known yet and fetch with `skipToken`. `useRegister` also invalidates `profileKeys.me()`. Mutation hooks go through `withCacheOnSuccess`, so a caller's `onSuccess` no longer replaces their cache update.
