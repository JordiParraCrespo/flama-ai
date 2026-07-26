# @flama/backend-core — Agent Instructions

Shared NestJS backend primitives: errors, exception filters, pipes,
interceptors, request helpers, and base services. Consumed by `apps/api` and
other backend packages.

> Read the root [`CLAUDE.md`](../../../CLAUDE.md) first, and the backend rules
> in [`.claude/rules/backend-packages.md`](../../../.claude/rules/backend-packages.md).

## Layout

```
src/
├── errors/         # domain/application error types
├── filters/        # NestJS exception filters
├── interceptors/   # response/logging interceptors
├── pipes/          # validation & transform pipes
├── requests/       # request-scoped helpers
├── services/       # shared base services
├── interfaces/     # shared interfaces
└── index.ts        # public surface
```

## Conventions

- Ships **CommonJS** (see `backend-packages.md`). Keep exports CJS-compatible.
- This is a **library** package (imported directly), not a pluggable service.
- Only export from `index.ts`; keep internal modules out of the public surface.

## Commands

```bash
pnpm --filter @flama/backend-core build
pnpm --filter @flama/backend-core dev    # watch
```
