---
paths:
  - "apps/api/**/*"
---

# API Configuration Rules

## Optional capabilities: a missing key removes a feature, it never throws

Anything a self-hoster might not have — OAuth credentials, Stripe, S3,
SMTP/Resend — is **optional capability config**, and the code must work
without it. Model absence honestly:

- Optional keys are genuinely optional in the Zod schema
  (`z.string().optional()`). **Never** a sentinel default like
  `.default('not-set')` or `|| 'disabled'` — a sentinel is a string pretending
  to be an absence: nothing type-checks that consumers know the magic value,
  and a consumer that doesn't check hands it to a real service, surfacing as
  an opaque provider-side error instead of "this feature isn't configured".
  With `.optional()`, absence is `undefined` and the compiler forces the
  check.
- Normalize blank env vars (`FOO=`) to `undefined` before validation with the
  `orUndefined` helper in `config/env.ts`, so `.url().optional()` and friends
  still boot.
- Declare the feature in `resolveCapabilities()`
  (`src/capabilities/capabilities.module.ts`). The resolved set — currently
  `google_oauth`, `github_oauth`, `stripe_billing`, `s3_storage`,
  `email_delivery` — is computed once at boot and logged at startup, so a
  self-hoster learns what the deployment can do from the log. Only the
  **client-facing subset** (`CLIENT_CAPABILITIES` in `@flama/shared`:
  the OAuth providers and `stripe_billing`) is served by
  `GET /health/capabilities`, so clients can hide UI for capabilities that are
  off (the web login page only renders configured providers). Server-internal
  capabilities (`s3_storage`, `email_delivery`) never go over the wire — a
  public endpoint must not describe a deployment's infrastructure beyond what
  its UI already reveals. Add a capability to `CLIENT_CAPABILITIES` only when
  a client has a UI decision hanging on it.
- Feature code that would need a missing key fails fast with a clear domain
  error ("Billing is not configured on this server"), the way
  `StripePaymentGateway` does — never by passing a placeholder downstream.

```typescript
// WRONG — crashes at boot if env var is empty
clientID: configService.getOrThrow<string>('oauth.google.clientId'),

// WRONG — boots, but leaks a fake credential to every consumer
clientId: z.string().default('not-set'),

// CORRECT — absence is representable; consumers must handle undefined
clientId: z.string().optional(),
```

### Required vs optional — keep the boundary explicit

Not every variable gets the capability treatment, and conflating the two is
how a deployment boots into a broken state. Settings the app cannot function
without (database credentials, `BETTER_AUTH_SECRET`) are **required**: validate
strictly (`z.string().min(8)`) and fail fast and loud at boot, as
`app.config.ts` does. The capability pattern is only for keys whose absence
removes a feature rather than breaking the app. Say which one a key is in a
comment in the config file.

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
