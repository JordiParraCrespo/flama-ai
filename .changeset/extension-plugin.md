---
"@flama/translations": minor
"@flama/frontend-web": patch
---

The `extension` namespace in `@flama/translations` — the copy of the Chrome extension `pnpm plugin:add extension` installs, including the strings Chrome itself shows, which its build writes into `_locales/`. The web kit's sign-out redirect is written as the `/login?redirect=…` URL it always produced (`loginHref`), so it typechecks outside an app whose router registers `/login` — the kit's own `typecheck`, and the extension; where it sends a reader is unchanged.
