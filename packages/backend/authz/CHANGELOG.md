# @flama/backend-authz

## 0.2.0

### Minor Changes

- 755b293: Add the authorization kernel: a feature module declares one resource object and
  gets tenant isolation, team scoping, row-level SQL filtering, a role-builder
  entry and a credential scope without writing an authorization check.

  Also closes two defects in the existing system: `PoliciesGuard` allowed any
  authenticated caller through a route that declared no policy, and roles were
  global (`role.name` was unique table-wide), so two tenants could not both define
  a `manager` role.

### Patch Changes

- Updated dependencies [755b293]
- Updated dependencies [7fdcefc]
- Updated dependencies [af46e89]
- Updated dependencies [b079e83]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
  - @flama/shared@0.3.0
  - @flama/backend-core@0.3.0
