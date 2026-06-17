---
"@flama/backend-ddd": minor
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
