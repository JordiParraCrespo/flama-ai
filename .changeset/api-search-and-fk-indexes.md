---
"@flama/api": patch
---

Add a trigram index for user search and indexes behind the two `user_role` foreign keys. On a large database run the scripts in `apps/api/db/ops/1789100000000-*` and `1789200000000-*` before deploying.
