# @flama/backend-storage — Agent Instructions

Pluggable file storage (local filesystem or S3) for the NestJS API.

> Read the root [`CLAUDE.md`](../../../CLAUDE.md) and
> [`.claude/rules/backend-packages.md`](../../../.claude/rules/backend-packages.md).

## Layout

```
src/
├── storage.module.ts        # NestJS module + factory
├── storage.service.ts       # abstract StorageService (the port)
├── local-storage.service.ts # local filesystem implementation
├── s3-storage.service.ts    # S3-compatible implementation
└── index.ts
```

## Conventions

- **Pluggable service pattern**: abstract `StorageService` → concrete
  implementations (local / S3) → chosen by the factory in `StorageModule`.
  Add a backend as another concrete class; keep the abstract contract stable.
- Ships **CommonJS**.

## Commands

```bash
pnpm --filter @flama/backend-storage build
pnpm --filter @flama/backend-storage dev
```
