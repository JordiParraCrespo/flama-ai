---
"@flama/frontend-core": minor
"@flama/translations": minor
"@flama/design-system-web": patch
---

Translate every validation issue. `createZodErrorMap` now words every Zod issue
code through a `validation.*` key (new: `invalid`, `format`, `choice`, `date`,
`min`, `max`, `multipleOf`, `tooLong`) instead of falling back to Zod's English,
and picks the applying branch of a union. A shared-schema `refine` names its
message with `params: { i18nKey }`. `refetchEverythingForNewIdentity` names the
one write (creating or joining a workspace) that may refetch every query.
`check-exports` ignores comments when it scans a component for `export *`.
