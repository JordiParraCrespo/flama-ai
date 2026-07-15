# @flama/backend-core

Cross-cutting NestJS primitives for the API: error model, exception filter,
validation/sanitization pipes, request-context plumbing, and pagination request
helpers. Depends on `@flama/backend-ddd`.

See `.claude/rules/nestjs-architecture.md` and `api-config.md` for how these are
wired into the API.

## What's inside

| Export                                                | Purpose                                             |
| ----------------------------------------------------- | --------------------------------------------------- |
| `AppError`, `ErrorDefinition`                         | Structured application error type                   |
| `AllExceptionsFilter`                                 | Global exception filter mapping errors to responses |
| `ZodValidationPipe`                                   | Validates DTOs against Zod schemas (`nestjs-zod`)   |
| `SanitizePipe`                                        | Input sanitization pipe                             |
| `RequestContextInterceptor` / `RequestContextService` | Per-request context propagation                     |
| `PaginatedRequest`, `paginationSchema`                | Standard pagination query request                   |
| `Mapper`                                              | Domain ↔ persistence/response mapper interface      |

## Usage

```ts
import {
  AllExceptionsFilter,
  ZodValidationPipe,
  PaginatedRequest,
} from "@flama/backend-core";
```

## Scripts

```bash
pnpm build   # tsc -> dist
pnpm dev     # tsc --watch
```

## Consumed by

`apps/api`, other `@flama/backend-*` packages.
