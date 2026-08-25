# @flama/backend-ddd

## 0.3.0

### Minor Changes

- 07eb972: Serve every API error as an RFC 7807 problem document.

  `AllExceptionsFilter` now answers with `application/problem+json` and the
  standard members — `type`, `title`, `status`, `detail`, `instance` — plus the
  `code`, `correlationId`, `timestamp` and `invalidParams` extensions, instead of
  the ad-hoc `{ statusCode, code, message }` body.

  - **Title vs detail.** `AppError` takes a second argument: `detail` (specific to
    one occurrence) and `extensions` (extra members). The catalog message stays
    the stable problem `title`, so handlers no longer interpolate request data
    into it — `TOKEN_002` and `TOKEN_005` now report the offending scopes in
    `detail` and as `ungrantableScopes` / `missingScopes`.
  - **Validation failures** list every rejected field in `invalidParams`.
  - **Domain exceptions** from `@flama/backend-ddd` carry an `httpStatus`, so a
    `NotFoundException` surfaces as 404 rather than a blanket 500.
  - **5xx responses** no longer echo the underlying message; the correlation id
    ties the response to the logged stack trace.
  - `type` URIs point at the new error reference (`https://flama.dev/errors`),
    configurable per deployment with `ERROR_TYPE_BASE_URL`.

  The `ProblemDetails` wire type lives in `@flama/shared`, replacing the unused
  `ApiErrorResponse`. The CLI and MCP clients
  read problem documents (still understanding the old body shape), `@flama/frontend`
  exposes `toAppError` and the `@MapApiError` method decorator so screens can show
  the server's `detail` and per-field errors, and `ApiProblemResponse` puts the
  schema in the OpenAPI document and the generated client.

- 9cf59be: Add a transactional outbox so domain events and queued jobs can no longer be
  silently lost between a database commit and their delivery.

  Previously repositories emitted domain events through `EventEmitter2` after the
  write, and queued jobs went to BullMQ/Redis outside the Postgres transaction —
  so a listener crash, a Redis blip, or a process killed between commit and
  dispatch dropped the side effect with no record it was ever owed.

  `@flama/backend-ddd` gains outbox building blocks alongside the existing
  aggregate/domain-event bases:

  - `OutboxMessageSchema` — a decorator-free `EntitySchema` for the new
    `outbox_message` table. `aggregateId` is a plain column with no foreign key,
    deliberately, so the queue outlives the records it names. Every row carries a
    human-readable `reason` so a queued item is self-explaining.
  - `OutboxService` — `stageEvents` / `stageJob` write rows **inside the caller's
    TypeORM transaction**, atomically with the aggregate write; `claim` leases due
    rows with `FOR UPDATE SKIP LOCKED` so multiple API replicas lease disjoint
    rows; leases expire (`lockedUntil`), so work owned by a dead process is
    reclaimed rather than stuck; failures retry with exponential backoff and park
    as `failed` after `maxAttempts` instead of disappearing.
  - `OutboxRelay` — the drain loop: a post-commit wake keeps happy-path latency at
    in-process levels, and a background poll is the crash-recovery safety net.
  - `DomainEvent` accepts an optional `reason` prop, recorded on the outbox row.

  `apps/api` wires it up: an `AddOutbox` migration, a global `OutboxModule`, and
  an `OutboxRelayService` that re-emits `event` rows on `EventEmitter2` (keyed by
  event class name, so existing `@OnEvent` handlers are unchanged — they now
  receive the deserialized payload rather than the class instance) and hands
  `queue` rows to the named BullMQ queue. The user, role, API-token and
  subscription repositories stage their aggregates' events through the outbox
  instead of emitting them directly.

  This does not replace BullMQ — it sits in front of it and closes exactly the
  `commit(); enqueue();` atomicity gap BullMQ cannot.

## 0.2.0

### Minor Changes

- aa0eefd: Refactor the API toward Domain-Driven Hexagon architecture.

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
