---
paths:
  - "apps/api/**/*"
  - "packages/backend/**/*"
---

# NestJS Architecture Rules

## Pluggable service pattern

All backend packages (`packages/backend/*`) follow this pattern:

1. **Abstract class** defines the interface (e.g. `EmailService`)
2. **Concrete implementations** provide behavior (e.g. `ConsoleEmailService`, `ResendEmailService`)
3. **`@Global` DynamicModule** with a factory reads config to select the active implementation

When adding a new pluggable service, follow this same pattern. Never hardcode a specific implementation in consumer code.

## Single-responsibility services

Each operation gets its own service class. Do not create god-services that handle multiple operations.

```
auth/services/
├── register.service.ts        # Only handles registration
├── login.service.ts           # Only handles login
├── refresh-tokens.service.ts  # Only handles token refresh
├── logout.service.ts          # Only handles logout
├── forgot-password.service.ts # Only handles forgot password
└── reset-password.service.ts  # Only handles reset password
```

## 3-layer mapper

Use the `Mapper<Entity, ServiceModel, ResponseDto>` interface from `@flama/backend-core`:

- `toRepository()` — partial data to entity
- `toService()` — entity to service model (strips sensitive fields like password, refreshToken)
- `toController()` — service model to response DTO

## Structured errors

Use `AppError` from `@flama/backend-core` with error catalogs per module:

```typescript
import { AppError } from "@flama/backend-core";
import { UserErrors } from "../errors/user.errors";

throw new AppError(UserErrors.NOT_FOUND);
```

Each error has a code (e.g. `AUTH_001`, `USER_001`), message, and HTTP status.

## Event-driven async processing

Use `EventEmitter2` for domain events and BullMQ for async jobs. Registration should not block on email sending.

```
Registration → UserRegisteredEvent → Listener → Email Queue → Processor → EmailService
```

## Cross-cutting concerns

- Filters, interceptors, pipes, and shared interfaces go in `packages/backend/core`, not in `apps/api`
- Email templates go in `packages/backend/email/src/templates/` as React components
- Shared types/schemas go in `packages/shared`, not duplicated in apps
