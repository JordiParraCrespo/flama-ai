---
"@flama/api": patch
---

Everything outside `roles` asks for an ability through the `AbilityPort` behind the `ABILITY` token, which takes `{ user, session }` rather than the request and memoizes one ability per resolved organization, and `RolesModule` exports only that token.
