---
"@flama/frontend-core": minor
"@flama/frontend-consumer": patch
---

New `shareEntities` in `@flama/frontend-core/react`: TanStack Query's `structuralSharing` for data made of entity classes. The default sharing only walks plain objects and arrays, and every frontend entity is a class carrying `Date`s, so each refetch — a refocus, an invalidation — handed every reader a new object per row. `shareEntities` also walks record-like class instances (same prototype, field by field) and compares `Date`s by time, keeping everything unchanged by reference; `Map`, `Set` and binary data are always taken as changed.

Every query hook that returns entities opts in: `useProfile`, `useUsers`, `useUser` and `useUserSettings` in core; `useApiTokens`, `useCurrentCredential`, `useMyProfile`, `useProfileSessions`, `useOrganizations`, `useOrganizationMembers`, `useOrganizationInvitations` and `useMyInvitations` in the consumer package. A caller's own `structuralSharing` in `options` still wins.
