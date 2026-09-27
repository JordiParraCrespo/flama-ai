---
"@flama/api": patch
---

`PoliciesGuard` asks for the caller's ability through a new `AbilityPort` (`auth/application/ability.port.ts`, bound to the `ABILITY` token in `auth.di-tokens.ts`) instead of importing `roles/application/ability.factory`. `RolesModule` binds its `AbilityFactory` to the token, so the auth kernel names no feature module. The route organization of an `@OrganizationScoped` route still decides the ability, as before.
