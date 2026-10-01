---
"@flama/api": patch
"@flama/translations": patch
---

Creating a role with no active organization answers `ROLE_008` unless the caller is a platform admin (`manage all`), who still creates global roles.
