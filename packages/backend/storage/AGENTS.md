# @flama/backend-storage — Agent Instructions

Pluggable file storage for the NestJS API: the storage port, the module that
binds it, and the local filesystem driver.

> Read the root [`CLAUDE.md`](../../../CLAUDE.md) and
> [`.agents/rules/backend-packages.md`](../../../.agents/rules/backend-packages.md).

## Layout

```
src/
├── storage.module.ts        # NestJS module: binds the port to the configured driver
├── storage.service.ts       # abstract StorageService (the port)
├── local-storage.service.ts # local filesystem implementation
└── index.ts
```

## Conventions

- **Pluggable service pattern**: abstract `StorageService` → concrete
  implementations (drivers) → chosen by the factory in `StorageModule`. The
  package ships the port and the local driver, and names no other: the app
  passes the drivers it runs on to `StorageModule.register({ local: … })`, and
  its config accepts exactly those names. A driver is a class whose
  constructor takes the `ConfigService`. Keep the abstract contract stable.
- **`upload` resolves to the key on every back-end**, and `getSignedUrl` is the
  only way to a URL. Callers persist keys; a URL (signed and expiring on an
  object store) is derived at read time.
- Ships **CommonJS**.

## Commands

```bash
pnpm --filter @flama/backend-storage build
pnpm --filter @flama/backend-storage dev
```
