---
"@flama/api": patch
---

In production the API refuses to boot on a `BETTER_AUTH_SECRET` shorter than
32 characters or containing `change-me` (the placeholder `.env.example`
ships). Development and test still boot on it.
