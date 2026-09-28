---
"@flama/api": major
"@flama/shared": major
"@flama/api-client": major
"@flama/frontend-consumer": major
"@flama/web": minor
"@flama/translations": minor
---

Personal API tokens (`/v1/tokens`, `/v1/me/credential`, the settings screen, the `tokens` scope, the `api_token_creation` flag) leave the starter for the `api-tokens` plugin. The API keeps sessions, the scope machinery and `SCOPED_CREDENTIAL`, the port a scoped credential binds; `@flama/shared` adds `flagCatalog` and a `./feature-flags/testing` fixture catalog.
