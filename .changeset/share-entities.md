---
"@flama/frontend-core": minor
"@flama/frontend-consumer": patch
---

Every query hook that returns entities goes through the new `useEntityQuery` in `@flama/frontend-core/react`, which fixes `structuralSharing` to `shareEntities` so a refetch that changed nothing keeps each unchanged entity's identity.
