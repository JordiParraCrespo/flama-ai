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
