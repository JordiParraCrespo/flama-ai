---
sidebar_position: 1
---

# Architecture Overview

Flama follows a monorepo architecture with clear separation of concerns.

## Backend

The API (`apps/api`) is built with NestJS and consumes 5 reusable backend packages from `packages/backend/`:

- **Authentication**: Better Auth (email/password + Google/GitHub OAuth), cookie sessions
- **Authorization**: CASL (role-based + attribute-based)
- **Database**: PostgreSQL with TypeORM
- **Caching**: Redis via [`@flama/backend-cache`](./backend-packages#flamabackend-cache)
- **Queues**: BullMQ via [`@flama/backend-queue`](./backend-packages#flamabackend-queue)
- **Email**: Pluggable with React Email templates via [`@flama/backend-email`](./backend-packages#flamabackend-email)
- **Storage**: Pluggable (Local / S3) via [`@flama/backend-storage`](./backend-packages#flamabackend-storage)
- **Cross-cutting**: Structured errors, correlation IDs, input sanitization via [`@flama/backend-core`](./backend-packages#flamabackend-core)
- **Logging**: Pino structured JSON logs
- **Rate limiting**: @nestjs/throttler
- **Health checks**: @nestjs/terminus + custom Redis indicator

See [Backend Packages](./backend-packages) for the shared package details and [API Architecture](./api-architecture) for the full API module breakdown.

## Pluggable service pattern

All backend packages follow the same pattern:

1. **Abstract class** defines the interface (e.g. `EmailService`)
2. **Concrete implementations** provide behavior (e.g. `ConsoleEmailService`, `ResendEmailService`)
3. **`@Global` DynamicModule** with a factory reads config to select the active implementation

This allows swapping providers (e.g. console email in dev, Resend in prod) without changing any consumer code.

## Frontend

Both web and mobile consume the `@flama/frontend` package which implements clean architecture:

- **Domain layer**: Entities, repository interfaces, service interfaces
- **Presentation layer**: Zustand stores, view models
- **Data access layer**: Repository implementations, API client adapters

Dependency injection is handled by InversifyJS, allowing platform-specific implementations to be swapped in.

See [Frontend Architecture](./frontend-architecture) for details.
