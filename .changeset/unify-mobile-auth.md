---
"@flama/design-system-mobile": minor
"@flama/frontend-mobile": minor
"@flama/mobile": minor
"@flama/mobile-showcase": patch
---

Give the Expo apps the same sign-in screens as the web apps.

`@flama/frontend-mobile` now owns the shared auth frame, forms, password
controls, social providers, and forgot/reset flows used by both Expo apps.
`@flama/design-system-mobile` adds the brand mark, and both apps receive the
matching theme tokens, inline translated failures, and terminal success states.
