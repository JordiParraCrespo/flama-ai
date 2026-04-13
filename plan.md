# Flama Backend Improvement Plan

## Decisions Made

| Decision         | Choice                                                                         |
| ---------------- | ------------------------------------------------------------------------------ |
| Architecture     | Pragmatic DDD (no full hexagonal)                                              |
| ORM              | Keep TypeORM                                                                   |
| CQRS             | Skip — plain services, EventEmitter2 for domain events                         |
| Result types     | Skip — keep throwing NestJS exceptions                                         |
| Error handling   | `AppError` class + per-module error catalogs with codes + `HttpStatus` enum    |
| Module structure | Services split per operation, no layer folders                                 |
| Mappers          | 3-method interface: `toRepository()`, `toService()`, `toController()`          |
| Validation       | Zod (global ZodValidationPipe, schemas from `@flama/shared`, `createZodDto`)   |
| Config           | Zod-validated per namespace, fail-fast at boot, no silent defaults for secrets |
| Domain events    | EventEmitter2, listeners in reacting module                                    |
| Emails           | All async via BullMQ queue                                                     |
| Testing          | Unit tests per service + integration tests for critical flows (Vitest)         |
| Packages         | Reusable backend utilities in `packages/backend/*` as separate packages        |
| API versioning   | `/api/v1/` prefix                                                              |
| API client       | Split by module (AuthClient, UsersClient)                                      |

---

## Phase 1: Backend Packages (`packages/backend/*`)

Extract reusable NestJS infrastructure into independent packages under `packages/backend/`.

### 1.1 `@flama/backend-core`

Create the core package with shared utilities used by any NestJS backend.

**Files to create:**

```
packages/backend/core/
  ├── src/
  │   ├── errors/
  │   │   └── app.error.ts              # AppError class using HttpStatus enum
  │   ├── filters/
  │   │   └── all-exceptions.filter.ts  # Global filter with correlation ID in response
  │   ├── interceptors/
  │   │   └── request-context.interceptor.ts  # Assigns correlation ID per request
  │   ├── pipes/
  │   │   └── zod-validation.pipe.ts    # Global Zod validation pipe
  │   ├── interfaces/
  │   │   └── mapper.interface.ts       # Mapper<Entity, ServiceModel, ResponseDto>
  │   ├── requests/
  │   │   └── paginated.request.ts      # Base paginated request (extends createZodDto)
  │   ├── services/
  │   │   └── request-context.service.ts  # Stores correlation ID per request (AsyncLocalStorage)
  │   └── index.ts
  ├── package.json                       # @flama/backend-core
  └── tsconfig.json
```

**Key implementation details:**

- `AppError` accepts an error definition object `{ code, message, httpStatus }` and extends `HttpException`
- `AllExceptionsFilter` includes `correlationId`, `code`, `message`, `timestamp` in every error response
- `RequestContextInterceptor` generates unique ID per request via `nanoid`
- `Mapper` interface: `toRepository(data) → Entity`, `toService(entity) → ServiceModel`, `toController(model) → ResponseDto`
- `PaginatedRequest` uses `z.coerce.number()` for query param parsing with defaults from `@flama/shared` PAGINATION constants

### 1.2 `@flama/backend-email`

Extract pluggable email service.

**Files to create:**

```
packages/backend/email/
  ├── src/
  │   ├── email.service.ts              # Abstract base class
  │   ├── console-email.service.ts      # Dev: logs to console
  │   ├── nodemailer-email.service.ts   # SMTP-based
  │   ├── resend-email.service.ts       # Resend API
  │   ├── email.module.ts               # Factory provider based on EMAIL_PROVIDER env
  │   └── index.ts
  ├── package.json                       # @flama/backend-email
  └── tsconfig.json
```

### 1.3 `@flama/backend-storage`

Extract pluggable storage service.

**Files to create:**

```
packages/backend/storage/
  ├── src/
  │   ├── storage.service.ts            # Abstract base class
  │   ├── local-storage.service.ts      # Filesystem-based
  │   ├── s3-storage.service.ts         # S3-compatible (AWS, Hetzner, MinIO)
  │   ├── storage.module.ts             # Factory provider based on STORAGE_PROVIDER env
  │   └── index.ts
  ├── package.json                       # @flama/backend-storage
  └── tsconfig.json
```

### 1.4 `@flama/backend-cache`

Extract pluggable cache service.

**Files to create:**

```
packages/backend/cache/
  ├── src/
  │   ├── cache.service.ts              # Abstract base class
  │   ├── redis-cache.service.ts        # Redis implementation
  │   ├── cache.module.ts               # Factory provider
  │   └── index.ts
  ├── package.json                       # @flama/backend-cache
  └── tsconfig.json
```

### 1.5 `@flama/backend-queue`

Extract BullMQ infrastructure + Bull Board setup.

**Files to create:**

```
packages/backend/queue/
  ├── src/
  │   ├── queue.module.ts               # BullMQ connection setup
  │   ├── bull-board.setup.ts           # Bull Board dashboard (admin-only, always on)
  │   └── index.ts
  ├── package.json                       # @flama/backend-queue
  └── tsconfig.json
```

### 1.6 Workspace configuration

- Add `packages/backend/*` to `pnpm-workspace.yaml`
- Add Turborepo build targets in `turbo.json`

---

## Phase 2: Config Overhaul (`apps/api/config/`)

Replace loose `process.env` reads with Zod-validated, typed config namespaces that fail fast at boot.

### 2.1 Zod-validated config namespaces

**Files to create/rewrite:**

```
apps/api/src/config/
  ├── app.config.ts         # port, nodeEnv, jwtSecret (required, min 32), jwtRefreshSecret, frontendUrl
  ├── database.config.ts    # host, port, username, password, database
  ├── redis.config.ts       # host, port
  ├── email.config.ts       # provider, from, smtp (host/port/user/pass), resendApiKey
  ├── storage.config.ts     # provider, uploadDir, s3 (endpoint/region/bucket/keys)
  ├── oauth.config.ts       # google (clientId/secret/callback), github (clientId/secret/callback)
  └── index.ts              # Re-exports all configs
```

**Key implementation details:**

- Each config uses `z.object()` + `registerAs()` from `@nestjs/config`
- No silent defaults for secrets — `jwtSecret`, `jwtRefreshSecret` use `z.string().min(32)` with no fallback
- `z.coerce.number()` for port fields
- `z.enum()` for provider fields (`'console' | 'nodemailer' | 'resend'`)
- App crashes at boot if required vars are missing or invalid

### 2.2 Fix `app.module.ts` factory functions

- `TypeOrmModule.forRootAsync` uses `ConfigService` inject instead of `process.env`
- `BullModule.forRoot` uses `ConfigService` inject
- `LoggerModule.forRoot` uses `ConfigService` inject
- All module configs read from typed config namespaces

---

## Phase 3: Error System

### 3.1 `AppError` class (in `@flama/backend-core`)

Already created in Phase 1. Extends `HttpException`, accepts `{ code, message, httpStatus }`.

### 3.2 Per-module error catalogs

**Files to create:**

```
apps/api/src/auth/errors/auth.errors.ts
apps/api/src/users/errors/user.errors.ts
```

**Example:**

```typescript
import { HttpStatus } from "@nestjs/common";

export const AuthErrors = {
  EMAIL_ALREADY_IN_USE: {
    code: "AUTH_001",
    message: "Email already in use",
    httpStatus: HttpStatus.CONFLICT,
  },
  INVALID_CREDENTIALS: {
    code: "AUTH_002",
    message: "Invalid credentials",
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
  INVALID_RESET_TOKEN: {
    code: "AUTH_003",
    message: "Invalid or expired reset token",
    httpStatus: HttpStatus.BAD_REQUEST,
  },
  ACCESS_DENIED: {
    code: "AUTH_004",
    message: "Access denied",
    httpStatus: HttpStatus.UNAUTHORIZED,
  },
} as const;

export const UserErrors = {
  NOT_FOUND: {
    code: "USER_001",
    message: "User not found",
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const;
```

### 3.3 Update `AllExceptionsFilter`

Error response format:

```json
{
  "statusCode": 409,
  "code": "AUTH_001",
  "message": "Email already in use",
  "correlationId": "abc123",
  "timestamp": "2026-04-14T..."
}
```

---

## Phase 4: Module Restructuring

Reorganize `auth/` and `users/` modules with services split per operation.

### 4.1 Auth module

**New structure:**

```
apps/api/src/auth/
  ├── services/
  │   ├── register.service.ts
  │   ├── login.service.ts
  │   ├── logout.service.ts
  │   ├── refresh-tokens.service.ts
  │   ├── forgot-password.service.ts
  │   └── reset-password.service.ts
  ├── requests/
  │   ├── register.request.ts           # createZodDto(registerSchema)
  │   ├── login.request.ts              # createZodDto(loginSchema)
  │   ├── forgot-password.request.ts
  │   └── reset-password.request.ts
  ├── dtos/
  │   ├── auth-response.dto.ts          # Token pair response
  │   └── profile-response.dto.ts       # User profile response
  ├── events/
  │   └── user-registered.event.ts
  ├── errors/
  │   └── auth.errors.ts
  ├── guards/
  │   ├── jwt-auth.guard.ts
  │   └── jwt-refresh.guard.ts
  ├── strategies/
  │   ├── jwt.strategy.ts
  │   ├── jwt-refresh.strategy.ts
  │   ├── local.strategy.ts
  │   ├── google.strategy.ts
  │   └── github.strategy.ts
  ├── decorators/
  │   └── current-user.decorator.ts
  ├── auth.controller.ts
  ├── auth.mapper.ts
  └── auth.module.ts
```

**Key changes:**

- Split `auth.service.ts` (8 methods) into 6 focused service files
- Each service is `@Injectable()` with a single `execute()` method
- Controller delegates to individual services
- Add `AuthMapper` with `toController()` for profile responses
- Wire requests via `createZodDto` for Swagger + validation
- Emit `UserRegisteredEvent` from `RegisterService`

### 4.2 Users module

**New structure:**

```
apps/api/src/users/
  ├── services/
  │   ├── update-user.service.ts
  │   └── delete-user.service.ts
  ├── requests/
  │   ├── update-user.request.ts         # createZodDto(updateUserSchema)
  │   └── find-users.request.ts          # Extends PaginatedRequest with filters
  ├── dtos/
  │   └── user-response.dto.ts
  ├── events/
  │   └── user-deleted.event.ts
  ├── errors/
  │   └── user.errors.ts
  ├── user.entity.ts
  ├── users.repository.ts
  ├── user.mapper.ts                     # toRepository(), toService(), toController()
  ├── users.controller.ts
  └── users.module.ts
```

**Key changes:**

- CRUD reads (findAll, findById) handled directly by controller → repository
- Write operations (update, delete) get their own service files
- `UserMapper` with 3 methods: `toRepository()`, `toService()`, `toController()`
- Whitelisting approach — only explicitly mapped fields are returned

---

## Phase 5: Domain Events & Async Email

### 5.1 EventEmitter2 setup

- Install `@nestjs/event-emitter`
- Register `EventEmitterModule.forRoot()` in `AppModule`

### 5.2 `UserRegisteredEvent`

- Emitted by `RegisterService` after successful registration
- Carries: `userId`, `email`, `firstName`

### 5.3 Email queue listener

**File:** `apps/api/src/queue/listeners/user-registered.listener.ts`

- Listens for `UserRegisteredEvent`
- Enqueues welcome email job in BullMQ EMAIL queue

### 5.4 Migrate all emails to queue

- `ForgotPasswordService` enqueues password-reset email via BullMQ instead of calling `emailService` directly
- `EmailProcessor` (already exists) handles all email job types
- No HTTP request ever waits on email delivery

### 5.5 Bull Board

- Mount at `/admin/queues`, protected by `JwtAuthGuard` + admin role
- Always on (dev, staging, production)

---

## Phase 6: Validation & Requests

### 6.1 Global ZodValidationPipe

- Register in `main.ts` via `app.useGlobalPipes()`
- Handles body, query, and param validation
- Returns structured validation errors

### 6.2 Shared pagination schema

- Add `paginationSchema` to `@flama/shared` (uses `z.coerce.number()` for query params)
- `PaginatedRequest` in `@flama/backend-core` extends `createZodDto(paginationSchema)`

### 6.3 Request files per module

- Each request file uses `createZodDto(schema)` from `nestjs-zod`
- Schemas imported from `@flama/shared`
- Swagger metadata generated automatically

---

## Phase 7: Security Hardening

### 7.1 Helmet

- `app.use(helmet())` in `main.ts`
- Secure HTTP headers out of the box

### 7.2 CORS whitelist

- Replace `app.enableCors()` with explicit origin config from `FRONTEND_URL`
- Mobile unaffected (CORS is browser-only)

### 7.3 Input sanitization

- Global pipe or interceptor that strips HTML/scripts from string inputs

### 7.4 CASL authorization

- Create `PoliciesGuard` that checks CASL abilities per route
- Create `@CheckPolicies()` decorator for route-level policy definition
- Wire permissions from `@flama/shared`
- Apply to user management endpoints (admin-only for delete, list, etc.)

---

## Phase 8: API Improvements

### 8.1 API versioning

- Enable NestJS URI versioning in `main.ts`
- Default version: `'1'`
- All routes become `/api/v1/auth/...`, `/api/v1/users/...`

### 8.2 Swagger response decorators

- Add `@ApiResponse()` on every endpoint with status codes, response types, and error codes
- Document error codes from module error catalogs

### 8.3 Correlation ID in responses

- `RequestContextInterceptor` sets correlation ID
- `AllExceptionsFilter` includes it in error responses
- Pino logger includes it in every log entry

---

## Phase 9: Database

### 9.1 Migrations

- Generate initial migration from current entity state
- Configure `data-source.ts` for migration CLI
- Add scripts: `pnpm migration:generate`, `pnpm migration:run`, `pnpm migration:revert`
- Keep `synchronize: true` for local dev only

### 9.2 Seeding

- Create `database/seeds/` directory
- Initial seed: admin user + test users
- Add `pnpm seed` script
- Seeds use TypeORM entities (stay in sync with schema)

### 9.3 Redis health check

- Add Redis ping check to `/ready` endpoint alongside DB, memory, and disk checks

---

## Phase 10: Testing

### 10.1 Unit tests

- One `.spec.ts` per service file
- Mock dependencies (repository, email, config)
- Test business logic: validation, error paths, happy paths

**Files to create:**

```
apps/api/src/auth/services/__tests__/register.service.spec.ts
apps/api/src/auth/services/__tests__/login.service.spec.ts
apps/api/src/auth/services/__tests__/logout.service.spec.ts
apps/api/src/auth/services/__tests__/refresh-tokens.service.spec.ts
apps/api/src/auth/services/__tests__/forgot-password.service.spec.ts
apps/api/src/auth/services/__tests__/reset-password.service.spec.ts
apps/api/src/users/services/__tests__/update-user.service.spec.ts
apps/api/src/users/services/__tests__/delete-user.service.spec.ts
```

### 10.2 Integration tests

- Testcontainers for PostgreSQL + Redis
- Test full auth flows: register → login → refresh → logout
- Test user CRUD with authorization (admin vs user)
- Test error responses (correct codes, correlation IDs)

---

## Phase 11: API Client

### 11.1 Split client by module

- Configure OpenAPI generator to split by `@ApiTags`
- Generate `AuthClient`, `UsersClient` as separate classes
- Update `pnpm generate:api-client`

---

## Dependency Flow (Updated)

```
@flama/backend-core     → used by apps/api (and future backends)
@flama/backend-email    → used by apps/api
@flama/backend-storage  → used by apps/api
@flama/backend-cache    → used by apps/api
@flama/backend-queue    → used by apps/api
@flama/shared           → used by all apps and packages
@flama/config           → used by all (tsconfig extends)
@flama/api-client       → used by @flama/frontend
```

---

## Execution Order

1. **Phase 1** — Backend packages (foundation everything depends on)
2. **Phase 2** — Config overhaul (needed before module restructuring)
3. **Phase 3** — Error system (needed before services throw AppError)
4. **Phase 4** — Module restructuring (biggest change, uses packages + errors)
5. **Phase 5** — Domain events & async email (uses new service structure)
6. **Phase 6** — Validation & requests (wire Zod to controllers)
7. **Phase 7** — Security hardening (independent, can be parallel)
8. **Phase 8** — API improvements (versioning, Swagger, correlation IDs)
9. **Phase 9** — Database migrations & seeding (independent)
10. **Phase 10** — Testing (after all code changes are stable)
11. **Phase 11** — API client regeneration (final step)
