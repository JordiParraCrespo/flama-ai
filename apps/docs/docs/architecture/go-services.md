---
sidebar_position: 7
---

# Go services

The product backend is NestJS and stays that way. Go enters for the one
service where Node is the wrong tool: a static binary with no runtime, tens
of thousands of long-lived connections, or orchestrating processes, VMs and
containers on a host. `apps/runner` is the template for that service, with a
working example workload so every layer is exercised before you replace it.

The consumer apps never talk to it. The NestJS API does, with an API key, and
the agents it manages talk back with short-lived service tokens.

## Same hexagon, idiomatic Go

The layer model mirrors `apps/api`; the machinery does not. Go has no
decorators and needs no DI container, so the same boundaries are expressed
with interfaces, constructors and package visibility:

| Concern              | NestJS (`apps/api`)                  | Go (`apps/runner`)                                   |
| -------------------- | ------------------------------------ | ---------------------------------------------------- |
| Module               | `@Module` + providers                | `internal/<ctx>/module.go` with `Options` and `New`  |
| Port                 | Abstract class + DI token            | Interface in `app/ports.go`                          |
| Adapter              | `@Injectable` bound to the token     | Struct asserting `var _ app.Port = (*Adapter)(nil)`  |
| Wiring               | Nest resolves the graph              | `internal/server` calls every constructor            |
| Errors               | `AppError` + `AllExceptionsFilter`   | `*problem.Error` returned from handlers              |
| Guards               | `@UseGuards`, `@CheckPolicies`       | `auth.Authenticate`, `auth.RequireScopes` on groups  |
| Boundary enforcement | dependency-cruiser                   | `internal/arch/arch_test.go`                         |

## What the template ships

- **Config** from the root `.env` outside production, real env vars winning,
  the bootstrap key required, service tokens optional and reported on
  `/health/capabilities`.
- **Errors** as the same RFC 7807 documents the API produces, with the runner
  catalog listed on the [error reference](../errors.md#runner-service).
- **Authentication** by API key (`flr_…`, SHA-256 at rest, revocable,
  scoped) or HS256 service token, both resolving to one `Principal`.
- **Scopes** in the `resource:read|write` vocabulary of the
  [permission catalog](../tooling/permissions.md): `jobs`, `keys`, `events`.
- **REST** on the standard library router with request ids, panic recovery,
  structured access logs, body limits and a trusted-proxy setting.
- **WebSocket** hub with topic subscriptions, per-connection backpressure,
  ping keepalive and a `1001 Going Away` on shutdown.
- **Jobs** as the example context: submit, list, cancel over REST; every
  transition pushed over the socket; a worker pool with cancellation.

## Choosing libraries

The standard library is the framework. Since Go 1.22 `net/http` routes by
method and path parameter, which removed the reason to reach for Gin, Echo,
Fiber or Gorilla's mux. The template adds exactly two dependencies:
`coder/websocket` and `golang-jwt`. Reach for `chi` only if you need route
groups the stdlib mux cannot express, and for `pgx` plus `goose` when the
in-memory repositories give way to Postgres.

## Running and building

```bash
pnpm --filter @flama/runner dev      # make dev, reads the root .env
pnpm --filter @flama/runner test     # go test + the boundary test
docker build -f apps/runner/Dockerfile .   # distroless, non-root, ~10 MB
```

CI runs `go vet`, `golangci-lint` and the tests in a dedicated job (the race
detector needs a C compiler the runners lack, so `make test-race` is a local
step) and publishes the image alongside the Node ones. See
`apps/runner/ARCHITECTURE.md` for the "add a bounded context" cookbook.
