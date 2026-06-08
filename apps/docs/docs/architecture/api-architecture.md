---
sidebar_position: 3
---

# API Architecture

The NestJS API (`apps/api`) follows a pragmatic DDD approach with single-responsibility services, event-driven async processing, and structured error handling.

## Module structure

```
apps/api/src/
├── auth/                  # Authentication & authorization
│   ├── auth.ts            # Better Auth instance (providers, email, plugins)
│   ├── email-queue.ts     # Standalone BullMQ queue for transactional emails
│   ├── entities/          # user / session / account / verification tables
│   ├── guards/            # PoliciesGuard (CASL)
│   └── decorators/        # @CurrentUser, @CheckPolicies
├── users/                 # User management
│   ├── services/          # UsersService, Update, Delete
│   ├── dtos/              # Response DTOs
│   ├── requests/          # Zod-validated request bodies
│   ├── errors/            # Error catalog
│   └── events/            # Domain events
├── health/                # Liveness + readiness checks
├── queue/                 # BullMQ processors + event listeners
├── config/                # 6 config factories
└── database/              # Seed script
```

## Auth module

Authentication is handled by [Better Auth](https://www.better-auth.com/),
mounted into NestJS via [`@thallesp/nestjs-better-auth`](https://github.com/ThallesP/nestjs-better-auth).
The Better Auth instance lives in `auth/auth.ts` and is registered in
`AppModule` with `AuthModule.forRoot({ auth })`.

### Configuration (`auth/auth.ts`)

| Feature            | Setup                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| Database           | Native Postgres adapter over the shared `pg` pool                     |
| Email / password   | `emailAndPassword` with `sendResetPassword` → BullMQ email queue      |
| Email verification | `emailVerification.sendVerificationEmail` → BullMQ email queue        |
| Social providers   | Google + GitHub (`socialProviders`), enabled when env vars are set    |
| Mobile             | `@better-auth/expo` plugin (SecureStore cookie + deep-link callbacks) |
| Custom user fields | `firstName`, `lastName`, `role`, `isActive` (additional fields)       |
| Welcome email      | `databaseHooks.user.create.after` → BullMQ email queue                |

### Endpoints

Better Auth exposes its own handler under `/api/auth/*` (sign-in/up, sign-out,
OAuth callbacks, password reset, email verification, session). Sessions are
**cookie-based**: an httpOnly cookie on web, and a SecureStore-backed cookie on
mobile via the Expo plugin.

### Sessions & guards

`@thallesp/nestjs-better-auth` provides the `AuthGuard` (attaches `req.user` /
`req.session`) and the `@Session()` decorator. The global guard is disabled
(`disableGlobalAuthGuard: true`); protected controllers opt in explicitly.

### Authorization

CASL-based authorization via `PoliciesGuard` + `@CheckPolicies()` decorator,
layered on top of Better Auth's `AuthGuard`:

```typescript
@UseGuards(AuthGuard, PoliciesGuard)
@CheckPolicies({ action: 'read', subject: 'User' })
@Get()
findAll() { ... }
```

The user `role` is stored as a Better Auth additional field and read from the
session. Permissions are defined in `packages/shared` and shared with the
frontend.

## Users module

### 3-layer mapper

`UserMapper` implements `Mapper<User, UserServiceModel, UserResponseDto>`:

- `toRepository()` — partial data to entity
- `toService()` — entity to service model (strips password, refreshToken)
- `toController()` — service model to response DTO

### Routes

| Route               | CASL policy | Handler           |
| ------------------- | ----------- | ----------------- |
| `GET /users`        | read User   | Paginated list    |
| `GET /users/:id`    | read User   | FindById          |
| `PATCH /users/:id`  | update User | UpdateUserService |
| `DELETE /users/:id` | delete User | DeleteUserService |

## Token management

`UserTokenService` centralizes all JWT and refresh token logic:

- `generateAndStoreTokens(userId, email, role)` — creates JWT pair, hashes refresh token, stores in DB
- `validateRefreshToken(userId, plainToken)` — bcrypt compare against stored hash
- `revokeRefreshToken(userId)` — nullifies stored token

## Event-driven processing

```
Registration → UserRegisteredEvent → Listener → Email Queue → Processor → EmailService
Deletion     → UserDeletedEvent    → (extensible via listeners)
```

Events use `@nestjs/event-emitter`. The email processor (`WorkerHost`) routes jobs by name to the appropriate `EmailService` method.

## Error catalog

| Code       | Message                        | HTTP |
| ---------- | ------------------------------ | ---- |
| `AUTH_001` | Email already in use           | 409  |
| `AUTH_002` | Invalid credentials            | 401  |
| `AUTH_003` | Invalid or expired reset token | 400  |
| `AUTH_004` | Access denied                  | 401  |
| `USER_001` | User not found                 | 404  |

All errors use `AppError` from `@flama/backend-core` for consistent structured responses.

## Health checks

| Route         | Type      | Checks                                                  |
| ------------- | --------- | ------------------------------------------------------- |
| `GET /health` | Liveness  | Memory heap < 200MB                                     |
| `GET /ready`  | Readiness | Database ping, Redis ping, memory heap, disk > 10% free |

`RedisHealthIndicator` is a custom ioredis-based health check (NestJS Terminus doesn't include one by default).

## Bootstrap order (`main.ts`)

1. Pino logger (structured JSON, pretty-print in dev)
2. Helmet (security headers)
3. CORS (origin from `app.frontendUrl`)
4. Global prefix `/api`
5. URI versioning (`v1`)
6. Global pipes: `SanitizePipe`, `ZodValidationPipe`
7. Swagger at `/api/docs`
8. Bull Board at `/admin/queues`

## Configuration

6 config factories, all Zod-validated:

| Config     | Key env vars                                                           |
| ---------- | ---------------------------------------------------------------------- |
| `app`      | `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL` |
| `database` | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`      |
| `redis`    | `REDIS_HOST`, `REDIS_PORT`                                             |
| `email`    | `EMAIL_PROVIDER`, `EMAIL_FROM`, `SMTP_*`, `RESEND_API_KEY`             |
| `oauth`    | `GOOGLE_CLIENT_ID/SECRET/CALLBACK`, `GITHUB_CLIENT_ID/SECRET/CALLBACK` |
| `storage`  | `STORAGE_PROVIDER`, `UPLOAD_DIR`, `S3_*`                               |
