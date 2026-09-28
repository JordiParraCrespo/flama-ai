---
"@flama/api-client": patch
"@flama/frontend-core": patch
---

The generated hey-api SDK sends the app's auth headers on every request, as the
legacy client always has, so a bearer-token app can call it. `toAppError` reads
a problem document the SDK throws bare.
