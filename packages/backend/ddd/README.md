# @flama/backend-ddd

Domain-Driven Hexagon building blocks for the API. Framework-agnostic — it has
**no NestJS dependency** — so the domain layer stays pure. `Result`-based error
handling comes from [`oxide.ts`](https://github.com/traverse1984/oxide.ts).

See [`apps/api/ARCHITECTURE.md`](../../../apps/api/ARCHITECTURE.md) for how these
pieces fit the layer model, and `.claude/rules/nestjs-architecture.md` for usage
rules.

## What's inside

- **Tactical patterns**: `Entity`, `AggregateRoot`, `ValueObject`, and their
  prop/ID types (`AggregateID`, `BaseEntityProps`, `CreateEntityProps`,
  `DomainPrimitive`, `Primitives`).
- **CQRS bases**: `CommandBase`, `QueryBase`, `DomainEvent` (+ their metadata/props types).
- **Ports**: `RepositoryPort`, `Paginated`, `PaginatedQueryParams`, `OrderBy`,
  and the `Mapper` interface.
- **Guards & exceptions**: `Guard`, `ExceptionBase`, `NotFoundException`,
  `ConflictException`, `ArgumentInvalidException`, `ArgumentNotProvidedException`,
  `ArgumentOutOfRangeException`.
- **Utilities**: `RequestContextService`, `convertPropsToObject`.

## Usage

```ts
import { AggregateRoot, type RepositoryPort, Guard } from "@flama/backend-ddd";
```

## Scripts

```bash
pnpm build   # tsc -> dist
pnpm dev     # tsc --watch
```

## Consumed by

`apps/api`, `@flama/backend-core`.
