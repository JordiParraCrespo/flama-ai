---
"@flama/backend-authz": patch
---

A bypass `AccessScope` (platform tier, `manage all`) skips only the slice within the tenant. `applyAccessScope` still applies the organization clause whenever the request names one, so an operator acting in a workspace no longer lists every workspace's rows; only a bypass with no active organization reaches every tenant.
