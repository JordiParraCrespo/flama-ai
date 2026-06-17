---
paths:
  - "apps/api/**/*"
  - "packages/backend/**/*"
---

# NestJS Architecture Rules

The API (`apps/api`) follows **Domain-Driven Hexagon** architecture. Dependencies
point inward: the domain depends on nothing, the application orchestrates the
domain, and infrastructure/interface adapters depend on the inside. The shared
building blocks live in `@flama/backend-ddd`.

## Module layout (vertical slices)

Each feature module is organised by use case, not by technical layer:

```
<module>/
├── commands/<use-case>/        # state changes (one folder per use case)
│   ├── <use-case>.command.ts        # extends CommandBase
│   ├── <use-case>.service.ts        # @CommandHandler (the handler)
│   ├── <use-case>.http.controller.ts
│   └── <use-case>.request.dto.ts    # Zod DTO (createZodDto), when there's a body
├── queries/<use-case>/         # reads (no side effects)
│   ├── <use-case>.query.ts          # extends QueryBase
│   ├── <use-case>.query-handler.ts  # @QueryHandler
│   └── <use-case>.http.controller.ts
├── domain/                     # pure domain, no framework/persistence imports
│   ├── <module>.entity.ts           # AggregateRoot / Entity
│   ├── value-objects/
│   ├── events/<event>.domain-event.ts
│   └── <module>.errors.ts
├── database/                   # infrastructure
│   ├── <module>.orm-entity.ts       # TypeORM persistence model
│   ├── <module>.repository.port.ts  # the port (interface)
│   └── <module>.repository.ts       # TypeORM adapter implementing the port
├── application/event-handlers/ # @OnEvent domain-event handlers
├── dtos/<module>.response.dto.ts
├── <module>.mapper.ts
├── <module>.di-tokens.ts
└── <module>.module.ts
```

## CQRS command/query handlers

Use `@nestjs/cqrs`. Each use case is one handler — this is how
single-responsibility is enforced (no god-services).

- Commands extend `CommandBase`, queries extend `QueryBase` (both from `@flama/backend-ddd`).
- Controllers dispatch through `CommandBus` / `QueryBus`; they never call handlers directly.
- **Commands return only the aggregate id** (or nothing). To return a full DTO
  after a write, dispatch a follow-up query and map the result.
- Queries are read-only and may bypass the domain to read optimized models.
- Import `CqrsModule` in the feature module and register handlers as providers.

## Domain layer

- Aggregates extend `AggregateRoot`, entities extend `Entity`, value objects
  extend `ValueObject` (from `@flama/backend-ddd`). Invariants are enforced in
  `validate()` / value-object constructors — entities are always valid.
- Do **not** redeclare `_id` (or other base fields) in a subclass: under
  `useDefineForClassFields` a subclass field initializer resets the value the
  base constructor set. The base owns `_id`.
- State changes go through domain methods (e.g. `user.updateProfile(...)`),
  which raise domain events via `addEvent(...)`.
- No TypeORM, NestJS or HTTP imports in `domain/`.

## Repository ports & adapters

- Define a port interface in `database/<module>.repository.port.ts`, extending
  `RepositoryPort<Aggregate>` from `@flama/backend-ddd`. Lookups return
  `Option<T>` (from `oxide.ts`), not `T | null`.
- The TypeORM adapter implements the port, maps domain ↔ ORM via the mapper, and
  publishes the aggregate's domain events after a successful write.
- Inject the port through a DI token (see `nestjs-di.md`), never the concrete class.

## Mapper

Use the `Mapper<DomainEntity, OrmEntity, ResponseDto>` interface from
`@flama/backend-ddd`:

- `toPersistence()` — domain entity → ORM record (only write columns the app owns)
- `toDomain()` — ORM record → domain entity
- `toResponse()` — domain entity → response DTO (never expose sensitive fields)

## Pluggable service pattern (backend packages)

Pluggable backend packages (`@flama/backend-email`, `-storage`, `-cache`,
`-queue`) follow this pattern:

1. **Abstract class** defines the interface (e.g. `EmailService`)
2. **Concrete implementations** provide behavior (e.g. `ConsoleEmailService`, `ResendEmailService`)
3. **`@Global` DynamicModule** with a factory reads config to select the active implementation

When adding a new pluggable service, follow this same pattern. Never hardcode a
specific implementation in consumer code. (Library packages like
`@flama/backend-core` and `@flama/backend-ddd` export building blocks instead —
see `backend-packages.md`.)

## Structured errors

Use `AppError` from `@flama/backend-core` with an error catalog per module in
`domain/<module>.errors.ts`:

```typescript
import { AppError } from "@flama/backend-core";
import { UserErrors } from "../../domain/user.errors";

throw new AppError(UserErrors.NOT_FOUND);
```

Each error has a code (e.g. `AUTH_001`, `USER_001`), message, and HTTP status.
Domain exceptions thrown by `@flama/backend-ddd` (e.g. `ArgumentInvalidException`)
are also surfaced through the global `AllExceptionsFilter`.

## Event-driven async processing

Domain events are raised by aggregates and published by the repository after a
write through `EventEmitter2` (keyed by the event class name). BullMQ handles
async jobs. Work that can be deferred (e.g. sending email) must not block the
request.

```
DeleteUserCommand → UserEntity.delete() raises UserDeletedDomainEvent
  → repository publishes after delete → @OnEvent handler → (Email Queue → Processor)
```

## Cross-cutting concerns

- DDD building blocks (entity/value-object/aggregate/event/command/query bases,
  ports, mapper interface, domain exceptions) live in `@flama/backend-ddd`
- Filters, interceptors, pipes, and shared interfaces go in `@flama/backend-core`, not in `apps/api`
- Email templates go in `packages/backend/email/src/templates/` as React components
- Shared types/schemas go in `packages/shared`, not duplicated in apps
