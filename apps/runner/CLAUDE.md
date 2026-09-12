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
  with `-race` and the import-boundary test in `internal/arch`

## Commands

```bash
make dev          # run with the root .env
make test-race    # what CI runs
make lint         # golangci-lint
```
