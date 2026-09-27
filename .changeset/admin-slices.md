---
"@flama/api": patch
"@flama/api-client": major
---

The admin API is cut into one slice per operation over a gateway port. Its
routes are unchanged; the generated client's functions for them are renamed
(`setUserRole`, `banUser`, `unbanUser`, `impersonateUser`, `listUserSessions`,
`revokeUserSession`, `revokeUserSessions`, `setUserPassword`). Impersonating
another administrator without the permission now answers `ADMIN_003`, not
`ADMIN_004`.
