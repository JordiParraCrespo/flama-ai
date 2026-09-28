---
"@flama/frontend-core": patch
---

`UsersRepository.myPermissions` parses the caller's permissions with the shared rule schema and refuses a malformed set (`USERS_CLIENT_005`) instead of casting it.
