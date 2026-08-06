---
paths:
  - "apps/api/**/*"
---

# API Configuration Rules

## One `.env`, at the root of the repo

There is **one `.env`, at the workspace root**, and the root `.env.example` is
its documentation. Never add a per-package `.env` or `.env.example`.

- If you add a variable, add it to the root `.env.example` with a note on what
  it does. The inverse rule keeps the file honest: every variable the repo
  reads is in it, and nothing that is not read is in it.
- Loading goes through `@flama/env` (`packages/env`): it finds the workspace
  root, loads `.env` then `.env.local` (local wins between the files), and
  **never overwrites a value already in `process.env`** — real environment
  variables always win, so the same code is correct in CI and in production
  containers. `vercel env pull` writes `.env.local`, which therefore silently
  overrides `.env`.
- Entry points load it as their first import: `import '@flama/env/load';`
  (`main.ts`, `config/data-source.ts`, `database/seed.ts`,
  `generate-openapi.ts`, `auth/auth.ts`). Do not import `dotenv/config` —
  it resolves `.env` against `process.cwd()`, which is exactly the fragility
  `@flama/env` replaces.
- `apps/web` does not use the loader: `vite.config.ts` points `envDir` at the
  workspace root. `apps/mobile` calls `loadEnv()` in `app.config.ts` so Metro
  inlines `EXPO_PUBLIC_*` values from the root file.

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
