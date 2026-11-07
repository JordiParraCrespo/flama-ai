---
'@flama/backend-authz': patch
'@flama/api': patch
---

A platform admin, or anyone holding `manage all`, no longer reaches other
people's rows of a resource with no organization key. Such a resource belongs
to a person, not a tenant; the access-scope bypass, which keeps the workspace
boundary for every other resource, removed the owner filter entirely.
`applyAccessScope` no longer lets a bypass or an `'all'` grant widen it: its
rows are the caller's own and the ones granted by id. `canGrantScope` takes the
resource definition and no longer lets a bypass or an `'all'` holder grant such
a row (an unregistered type is held to the same rule); only a row already
granted by name can be passed on. Ported from Oppenheimer.
