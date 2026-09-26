---
"@flama/frontend-core": minor
"@flama/frontend-consumer": minor
"@flama/frontend-web": minor
"@flama/frontend-mobile": minor
"@flama/shared": minor
---

Hold the frontend to its architecture, and move what both platforms need into
the kernel.

`@flama/frontend-core` gains `./format` (the `Intl` date helpers, moved from
the web kit), `useLocale`, `useAbilityState`/`useAbility` (moved from the web
kit's shell), `useRespondToConsent` with an optional
`IAuthClient.respondToConsent`, `HookMutationOptions`, `personInitials` and
`UserEntity.initials`. `usersKeys.list()` appends its params only when a facet
is set. The web kit re-exports what moved, so `@flama/frontend-web` callers
keep their imports.

`@flama/frontend-consumer` gains `slugify`, `toCreateOrganizationDto` and
`useAcceptInvitationAsNewcomer`; its mutation hooks type `options` as
`HookMutationOptions`, so a caller can no longer pass a `mutationFn`.

`@flama/frontend-web` gains `SectionNav` and `PasswordChecklist`; `i18n`
becomes a middle concern. `@flama/frontend-mobile` gains `SignOutButton`,
`ScreenErrorFallback` takes an optional title, message and retrying state, and
`newPasswordSchema` moves to `@flama/shared/schemas/auth` (removed from the
mobile kit's exports); `config` becomes a middle concern.
