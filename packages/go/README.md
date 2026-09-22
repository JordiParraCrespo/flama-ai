# packages/go — shared Go modules

The Go counterpart of `packages/backend/*`: reusable modules every Go
service in the monorepo builds on, each an interface plus implementations
plus a constructor the service selects by config. One `go.work` at the repo
root ties them together; each module also carries relative `replace`
directives so it stays buildable and tidy-able on its own.

| Module       | npm name           | Purpose                                                                          |
| ------------ | ------------------ | -------------------------------------------------------------------------------- |
| `core`       | `@flama/go-core`   | `problem`: RFC 7807 documents mirroring the API's; `logging`: slog setup         |
| `config`     | `@flama/go-config` | Root `.env` loader mirroring `@flama/env`; typed accessors that collect errors   |
| `httpx`      | `@flama/go-httpx`  | `net/http` router with middleware groups, error-returning handlers, JSON, server |
| `health`     | `@flama/go-health` | `/healthz`, `/readyz` with registered checkers, `/health/capabilities`           |
| `auth`       | `@flama/go-auth`   | Bearer middleware, `Principal`, scope grammar and guard, HS256 service tokens    |
| `ws`         | `@flama/go-ws`     | WebSocket hub: topics, backpressure, keepalive, graceful going-away              |
| `postgres`   | `@flama/go-postgres` | Pooled `pgx` connection, forward-only SQL migrator (advisory-locked), readiness checker |

Dependency flow: `core` ← `httpx` ← `health`, `auth` ← `ws`; `config` and
`postgres` stand alone. A module never imports an app.

## How Turborepo sees them

Every module has a `package.json` naming it `@flama/go-<module>` with
`build`, `lint` and `test` scripts that call `go` directly, and declares the
modules it imports as `workspace:*` devDependencies. That declaration is
what gives Turborepo the graph: `apps/runner` lists all seven, so
`turbo run build --filter=@flama/runner` builds them first, `--affected`
re-runs dependents when a module changes, and a change in `core`
invalidates the cache of everything above it while `config` stays cached.
The per-package `turbo.json` adds `go.work` (and `.golangci.yml` for lint)
to the hashed inputs, since adding a module changes what `./...` resolves
to. Library builds produce no files; only the runner's `dist/**` is cached.

## Commands

```bash
pnpm turbo run build test --filter='./packages/go/*'   # through Turborepo
make -C packages/go test                               # whole workspace, from go.work
make -C packages/go tidy                               # go mod tidy for every module
```

The repo root is not a module, so `./...` does not resolve there. Use the
module-path pattern (`go test github.com/jordiparracrespo/flama-ai/...`) or
the Makefile, which derives directory patterns from `go list -m`.

## Adding a module

1. `packages/go/<name>/go.mod` with the module path
   `github.com/jordiparracrespo/flama-ai/packages/go/<name>`, plus a
   `require` and a relative `replace` for every sibling it imports, transitively.
2. Add it to `use (...)` in the root `go.work`.
3. `package.json` named `@flama/go-<name>` with the three scripts and the
   sibling modules as `workspace:*` devDependencies; copy a sibling's
   `turbo.json`.
4. `pnpm install` to refresh the lockfile.
5. Consumers add the module to their `go.mod` (require + replace) and to
   their `package.json` devDependencies. `apps/runner/internal/arch` decides
   which layers of a service may import it.

Rules for the code itself are in `.agents/rules/go.md`.

## Go services

The product backend is NestJS and stays that way. Go enters for the one
service where Node is the wrong tool: a static binary with no runtime, tens
of thousands of long-lived connections, or orchestrating processes, VMs and
containers on a host. `apps/runner` is the template for that service, with a
working example workload so every layer is exercised before you replace it.

The consumer apps never talk to it. The NestJS API does, with an API key, and
the agents it manages talk back with short-lived service tokens.

### Same hexagon, idiomatic Go

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

### Shared modules, the Go `packages/backend`

Everything domain-agnostic lives in `packages/go/*`, one Go module per
concern, tied together by a `go.work` at the repo root:

| Module   | Turborepo name     | Provides                                                   |
| -------- | ------------------ | ---------------------------------------------------------- |
| `core`   | `@flama/go-core`   | RFC 7807 documents, slog setup                             |
| `config` | `@flama/go-config` | Root `.env` loader, typed accessors that collect errors    |
| `httpx`  | `@flama/go-httpx`  | Router with middleware groups, JSON helpers, server        |
| `auth`   | `@flama/go-auth`   | Bearer middleware, `Principal`, scope grammar, JWT         |
| `health` | `@flama/go-health` | Liveness, readiness, capabilities                          |
| `ws`     | `@flama/go-ws`     | WebSocket hub with backpressure and keepalive              |
| `postgres` | `@flama/go-postgres` | Pooled pgx connection, advisory-locked SQL migrator, readiness checker |

Each module has a `package.json` whose scripts call `go` directly and which
declares the sibling modules it imports as workspace dependencies. That is
what lets Turborepo order builds, run `--affected` and invalidate caches
correctly: a change in `core` re-runs everything above it while `config`
stays cached. Every module also carries relative `replace` directives so it
builds and tidies on its own, which is what the Docker build relies on.

### What the template ships

- **Config** from the root `.env` outside production, real env vars winning,
  the bootstrap key required, service tokens optional and reported on
  `/health/capabilities`.
- **Errors** as the same RFC 7807 documents the API produces (from
  `packages/go/core/problem`). Each module owns its codes in its own
  `domain/errors.go` — `apps/runner/internal/jobs/domain/errors.go` and
  `apps/runner/internal/apikeys/domain/errors.go` are the `JOB_*` and
  `APIKEY_*` catalogs.
- **Authentication** by API key (`flr_…`, SHA-256 at rest, revocable,
  scoped) or HS256 service token, both resolving to one `Principal`.
- **Scopes** in the `resource:read|write` vocabulary of the
  [permission catalog](../shared/src/scopes/README.md): `jobs`, `keys`, `events`.
- **REST** on the standard library router with request ids, panic recovery,
  structured access logs, body limits and a trusted-proxy setting.
- **WebSocket** hub with topic subscriptions, per-connection backpressure,
  ping keepalive and a `1001 Going Away` on shutdown.
- **Jobs** as the example context: submit, list, cancel over REST; every
  transition pushed over the socket; a worker pool with cancellation.

### Choosing libraries

The standard library is the framework. Since Go 1.22 `net/http` routes by
method and path parameter, which removed the reason to reach for Gin, Echo,
Fiber or Gorilla's mux. The template adds exactly two dependencies:
`coder/websocket` and `golang-jwt`. Reach for `chi` only if you need route
groups the stdlib mux cannot express, and for `pgx` plus `goose` when the
in-memory repositories give way to Postgres.

### Running and building

```bash
pnpm --filter @flama/runner dev                 # reads the root .env
pnpm turbo run test --filter='./packages/go/*'  # the shared modules
make -C packages/go test                        # every Go module in go.work
docker build -f apps/runner/Dockerfile .        # distroless, non-root, ~10 MB
```

CI runs `go vet`, `golangci-lint` and the tests across the whole workspace
in a dedicated job (the race detector needs a C compiler the runners lack,
so `make test-race` is a local step), builds the Go packages through
Turborepo like the Node ones, and publishes the image alongside them. See
`apps/runner/ARCHITECTURE.md` for the "add a bounded context" cookbook.
