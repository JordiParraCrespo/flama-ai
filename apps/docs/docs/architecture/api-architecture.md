---
sidebar_position: 3
---

# API Architecture

The NestJS API (`apps/api`) follows a pragmatic DDD approach with single-responsibility services, event-driven async processing, and structured error handling.

## Module structure

```
apps/api/src/
├── auth/                  # Authentication & authorization
│   ├── services/          # One service per auth operation
│   ├── strategies/        # Passport strategies (JWT, Google, GitHub)
│   ├── guards/            # JwtAuthGuard, JwtRefreshGuard, PoliciesGuard
│   ├── decorators/        # @CurrentUser, @CheckPolicies
│   ├── dtos/              # Response DTOs
│   ├── requests/          # Zod-validated request bodies
│   └── events/            # Domain events
├── users/                 # User management
│   ├── services/          # UsersService, UserTokenService, Update, Delete
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

### Services

Each auth operation has its own service:

| Service                 | Responsibility                                                            |
| ----------------------- | ------------------------------------------------------------------------- |
| `RegisterService`       | Check email unique, hash password, create user, emit event, return tokens |
| `LoginService`          | Find by email, bcrypt compare, return tokens                              |
| `RefreshTokensService`  | Validate refresh token, generate new pair                                 |
| `LogoutService`         | Revoke refresh token                                                      |
| `ForgotPasswordService` | Generate reset token, store with 1hr expiry, queue email                  |
| `ResetPasswordService`  | Find by token, check expiry, hash new password, clear token               |
| `ValidateOAuthService`  | Find or create OAuth user, generate tokens                                |

### Strategies

| Strategy                  | Guard         | Token source                    |
| ------------------------- | ------------- | ------------------------------- |
| `jwt.strategy.ts`         | `jwt`         | `Authorization: Bearer <token>` |
| `jwt-refresh.strategy.ts` | `jwt-refresh` | `body.refreshToken`             |
| `local.strategy.ts`       | `local`       | `body.email` + `body.password`  |
| `google.strategy.ts`      | `google`      | Google OAuth2 callback          |
| `github.strategy.ts`      | `github`      | GitHub OAuth2 callback          |

### Routes

| Route                        | Auth            | Throttle | Handler               |
| ---------------------------- | --------------- | -------- | --------------------- |
| `POST /auth/register`        | none            | 5/min    | RegisterService       |
| `POST /auth/login`           | none            | 10/min   | LoginService          |
| `POST /auth/refresh`         | JwtRefreshGuard | -        | RefreshTokensService  |
| `POST /auth/logout`          | JwtAuthGuard    | -        | LogoutService         |
| `POST /auth/forgot-password` | none            | 3/min    | ForgotPasswordService |
| `POST /auth/reset-password`  | none            | -        | ResetPasswordService  |
| `GET /auth/profile`          | JwtAuthGuard    | -        | UsersService.findById |
| `GET /auth/google`           | GoogleGuard     | -        | OAuth redirect        |
| `GET /auth/google/callback`  | GoogleGuard     | -        | ValidateOAuthService  |
| `GET /auth/github`           | GitHubGuard     | -        | OAuth redirect        |
| `GET /auth/github/callback`  | GitHubGuard     | -        | ValidateOAuthService  |

### Authorization

CASL-based authorization via `PoliciesGuard` + `@CheckPolicies()` decorator:

```typescript
@UseGuards(JwtAuthGuard, PoliciesGuard)
@CheckPolicies({ action: 'read', subject: 'User' })
@Get()
findAll() { ... }
```

Permissions are defined in `packages/shared` and shared with the frontend.

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
