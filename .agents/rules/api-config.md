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

## Reading config in services — private getters, not inline lookups

Don't scatter `configService.get(...)` calls and their `?? default` ternaries
through a handler's `execute()`. Wrap each config-derived value in a named
`private get` accessor and let `execute()` read the intent, not the plumbing.
This keeps the method readable and the fallbacks in one place.

```typescript
// WRONG — inline lookups + nested ternaries in the use case
async execute(command: CreateCheckoutCommand): Promise<string> {
  const frontendUrl = this.configService.get<string>('app.frontendUrl') ?? '';
  const successUrl =
    command.successUrl ??
    this.configService.get<string>('stripe.successUrl') ??
    `${frontendUrl}/billing?status=success`;
  // ...
}

// CORRECT — the use case reads `command.x ?? this.defaultX`
async execute(command: CreateCheckoutCommand): Promise<string> {
  return this.gateway.createCheckoutSession({
    successUrl: command.successUrl ?? this.defaultSuccessUrl,
    // ...
  });
}

private get frontendUrl(): string {
  return this.configService.get<string>('app.frontendUrl') ?? '';
}

private get defaultSuccessUrl(): string {
  return (
    this.configService.get<string>('stripe.successUrl') ??
    `${this.frontendUrl}/billing?status=success`
  );
}
```

Config files (`config/*.config.ts`) still own env parsing/validation via Zod;
normalize blank env vars (`FOO=`) to `undefined` before validation so
`.url().optional()` and friends still boot (e.g. an `orUndefined` helper).

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

## Logging

Request logging comes from `LoggingModule` in `@flama/backend-core`
(`nestjs-pino` with hardened defaults), imported once in `AppModule`.

- **Never log headers, query strings, or request bodies.** They routinely carry
  session cookies, bearer tokens, and personal data. The module's serializers
  drop them (and redact credential headers as a backstop) — log only the
  specific fields a handler knows are safe.
- **Structured fields, one object per line.** Nest prints one line per
  argument, so `logger.log('Saved', { userId })` emits two lines. Hoist fields
  to the top level of a single object instead:

  ```typescript
  // WRONG — two log lines; fields never attach to the message
  this.logger.log('Saved user', { userId });

  // CORRECT — one JSON line with searchable top-level fields
  this.logger.log({ message: 'Saved user', userId });
  ```

- **Errors pass the stack as the second argument.** Passing the error object
  itself loses the trace:

  ```typescript
  this.logger.error(
    { message: 'Subscription sync failed', subscriptionId },
    error instanceof Error ? error.stack : String(error),
  );
  ```

- **User context is automatic.** `UserContextInterceptor` attaches `userId`
  (and the credential's effective `scopes`) to the request log context once the
  auth guards resolve — never add them by hand, and never log emails or names.
- **`/api/auth/*` is logged through Better Auth's `middleware` option** on
  `BetterAuthModule.forRoot` in `AppModule`. Better Auth mounts its handler
  onto the HTTP adapter before Nest binds consumer middleware, so the main
  request logger cannot see those routes — keep that option wired.
- **SQL query logging is opt-in** via `DB_LOG_QUERIES=true`, off by default
  because it buries every other line under a wall of SELECTs. Even when
  enabled, `TypeOrmQueryLogger` drops bound parameters — they carry user data.
