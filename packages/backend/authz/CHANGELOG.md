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

- Updated dependencies [a033f38]
- Updated dependencies [c6da16b]
- Updated dependencies [755b293]
- Updated dependencies [548b754]
- Updated dependencies [7fdcefc]
- Updated dependencies [af46e89]
- Updated dependencies [e5a762a]
- Updated dependencies [60cb5a9]
- Updated dependencies [4dbb193]
- Updated dependencies [b079e83]
- Updated dependencies [0f089c6]
- Updated dependencies [e5d510f]
- Updated dependencies [6bf67a5]
- Updated dependencies [07eb972]
- Updated dependencies [d532ef4]
- Updated dependencies [4c48c8b]
- Updated dependencies [f96d51a]
- Updated dependencies [d06200f]
  - @flama/shared@1.0.0
  - @flama/backend-core@0.3.0
