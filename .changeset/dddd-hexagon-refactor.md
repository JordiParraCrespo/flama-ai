---
"@flama/backend-ddd": minor
"@flama/backend-core": minor
"@flama/api": minor
---

Refactor the API toward Domain-Driven Hexagon architecture.

- Add `@flama/backend-ddd`, a building-blocks package with `Entity`,
  `AggregateRoot`, `ValueObject`, `DomainEvent`, `CommandBase`, `QueryBase`,
  the `RepositoryPort`/`Paginated` abstractions, a domain/persistence/response
  `Mapper` interface, domain exceptions and `Guard`.
- Restructure the users module into vertical slices (`commands/`, `queries/`,
  `domain/`, `database/`, `dtos/`, `application/`) on top of `@nestjs/cqrs`,
  with a `UserEntity` aggregate, an `Email` value object, a
  `UserRepositoryPort` and its TypeORM adapter, and domain-event publishing.
- Invert the `@flama/backend-ddd` ↔ `@flama/backend-core` layering: the
  framework-free `RequestContextService` and the `ErrorDefinition` contract now
  live in `@flama/backend-ddd` (re-exported from `@flama/backend-core` for
  backwards compatibility), so the domain layer depends on no infrastructure.
- Document the architecture in `apps/api/ARCHITECTURE.md`, add a
  `/scaffold-module` skill, and enforce the layer boundaries with
  dependency-cruiser (`pnpm arch`, wired into CI and a Stop hook).
