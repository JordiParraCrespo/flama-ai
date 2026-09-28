---
"@flama/react-hooks": minor
"@flama/design-system-web": minor
"@flama/design-system-mobile": minor
"@flama/frontend-web": minor
---

The generic hooks (`useControlled`, `useDebouncedValue`, `useDebouncedCallback`, `useNow`) live once in the new `@flama/react-hooks`, which both design systems import instead of each keeping a copy, so import them from there — neither design system nor `@flama/frontend-web` exports them any more.
