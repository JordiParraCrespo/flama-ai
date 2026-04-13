---
sidebar_position: 1
---

# Architecture Overview

Flama follows a monorepo architecture with clear separation of concerns.

## Backend

The API is built with NestJS and includes:

- **Authentication**: Passport.js with JWT (local + Google/GitHub OAuth)
- **Authorization**: CASL (role-based + attribute-based)
- **Database**: PostgreSQL with TypeORM
- **Caching**: Redis (pluggable interface)
- **Queues**: BullMQ for async jobs
- **Email**: Pluggable (Console / Nodemailer / Resend)
- **Storage**: Pluggable (Local / S3-compatible)
- **Logging**: Pino structured JSON logs
- **Rate limiting**: @nestjs/throttler
- **Health checks**: @nestjs/terminus

## Frontend

Both web and mobile consume the `@flama/frontend` package which implements clean architecture:

- **Domain layer**: Entities, repository interfaces, service interfaces
- **Presentation layer**: Zustand stores, view models
- **Data access layer**: Repository implementations, API client adapters

Dependency injection is handled by InversifyJS, allowing platform-specific implementations to be swapped in.
