# @flama/runner — Agent Instructions

Go service template. Read the root [`CLAUDE.md`](../../CLAUDE.md) first, then
[`ARCHITECTURE.md`](./ARCHITECTURE.md) here. The rules for this app live in
`.agents/rules/go.md`.

## Stack

- Go 1.24, standard `net/http` routing (method + path params), no framework
- `log/slog` for logging, `coder/websocket` for the socket, `golang-jwt/v5`
  for service tokens. Add a dependency only when the standard library cannot
  do the job
- `golangci-lint` (config in `.golangci.yml`); `pnpm test` runs the suite
  and the import-boundary test in `internal/arch`. `make test-race` runs it
  under the race detector, which CI cannot (no C compiler on the runners),
  so run it locally before pushing concurrent code

## Commands

```bash
make dev          # run with the root .env
make test         # what CI runs
make test-race    # run locally for anything concurrent
make lint         # golangci-lint
```
