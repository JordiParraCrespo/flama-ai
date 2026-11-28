---
"@flama/api": patch
---

A session can no longer hide itself from Active sessions: `delegated` and
`delegatedCredentialId` are no longer fields `POST /api/auth/update-session`
accepts, so only the server marks a credential's bridge session.
