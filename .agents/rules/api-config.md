---
paths:
  - "apps/api/**/*"
---

# API Configuration Rules

## OAuth strategies must handle missing credentials

Use `configService.get() || 'disabled'` instead of `getOrThrow()` for OAuth config so the app boots without OAuth env vars configured.

```typescript
// WRONG — crashes at boot if env var is empty
clientID: configService.getOrThrow<string>('oauth.google.clientId'),

// CORRECT — boots gracefully, OAuth just won't work
clientID: configService.get<string>('oauth.google.clientId') || 'disabled',
```

## Controllers

Endpoints live in per-use-case `*.http.controller.ts` files inside their
`commands/` or `queries/` slice (see `nestjs-architecture.md`). Controllers only
dispatch through the `CommandBus` / `QueryBus` and map results — no business
logic. Multiple controllers share a `@Controller('<resource>')` path; order them
in the module's `controllers` array so static routes (e.g. `me`) are registered
before parameterized ones (e.g. `:id`).

## Swagger decorators required

All API endpoints need `@ApiOperation`, `@ApiResponse`, and `@ApiTags` decorators for the auto-generated client (`pnpm generate:api-client`).

## Validation

- Request DTOs use Zod schemas from `packages/shared`
- All user input is sanitized via `SanitizePipe` (strips HTML) and validated via `ZodValidationPipe`

## Rate limiting

Apply `@Throttle()` on public-facing endpoints:

| Endpoint        | Limit  |
| --------------- | ------ |
| Register        | 5/min  |
| Login           | 10/min |
| Forgot password | 3/min  |

## Versioning

All routes use URI versioning with `@Version('1')`. The default version is `v1`.
