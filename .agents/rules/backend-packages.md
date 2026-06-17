---
paths:
  - "packages/backend/**/*"
---

# Backend Packages Rules

## CJS exports required

All `packages/backend/*` must have both `"import"` and `"require"` in their `package.json` exports. NestJS runs in CommonJS mode and will throw `ERR_PACKAGE_PATH_NOT_EXPORTED` without `"require"`.

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.js"
    }
  }
}
```

## Package structure

There are two kinds of backend package:

**Pluggable services** (`email`, `storage`, `cache`, `queue`) — an abstract
service selected at runtime by a factory:

```
packages/backend/<name>/
├── src/
│   ├── index.ts              # Barrel export
│   ├── <name>.service.ts     # Abstract class (interface)
│   ├── <impl>.service.ts     # Concrete implementation(s)
│   └── <name>.module.ts      # @Global DynamicModule with factory
├── package.json
└── tsconfig.json
```

**Library packages** (`core`, `ddd`) — export building blocks (base classes,
interfaces, filters, pipes) with no abstract service or `@Global` module. They
still follow the CJS export and shared-config rules below. `@flama/backend-ddd`
holds the DDD/hexagon primitives; `@flama/backend-core` holds cross-cutting
NestJS infrastructure.

## Email package specifics

- `tsconfig.json` must have `"jsx": "react-jsx"` for React Email templates
- `react`, `@react-email/components`, `@react-email/render` are **production** deps (not devDeps)
- Templates live in `src/templates/` as React components

## Shared config dependency

All backend packages depend on `@flama/config` for TypeScript config. Reference it via workspace protocol: `"@flama/config": "workspace:*"`.
