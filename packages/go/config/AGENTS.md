# @flama/go-config — Agent Instructions

> Read the root [`CLAUDE.md`](../../../CLAUDE.md) first.

The `.env` loader and typed env accessors shared by Go services. It is the
Go twin of `@flama/env`: same root marker, same "real variables win" rule,
same quoting.

## Where things go

- A new accessor kind (a list, a URL) is a method on `Env` in `env.go` that
  records its failure with `e.fail` and returns the default, like `Int` and
  `Duration` do.
- Dotenv parsing rules are in `dotenv.go` (`parseValue`); keep them in step
  with what `dotenv` accepts on the Node side.
- Tests are in `env_test.go` and use a map-backed `Lookup`, never `os.Setenv`.
- A variable name (`RUNNER_*`) never belongs here; it goes in the service's
  `internal/config` and in the root `.env.example`.

## Before pushing

```bash
pnpm --filter @flama/go-config lint
pnpm --filter @flama/go-config test
pnpm --filter @flama/go-config build
```

## Patterns agents get wrong

- Returning on the first bad variable. Accessors record and continue; the
  caller checks `env.Err()` once, so an operator sees every problem at once.
- Treating `FOO=` as set. `Optional` and `Secret` read blank as absent so an
  empty line in `.env` does not switch a capability on with an empty secret.
- Loading `.env` in production or letting the file overwrite a real
  variable. `LoadDotenv` skips keys that exist; the service decides by `Mode`
  whether to call it at all.
- Reading `os.Getenv` from inside a module. Constructors take `Options`;
  only the service's `internal/config` touches the environment.

See [`.agents/rules/go.md`](../../../.agents/rules/go.md) and
[`.agents/rules/api-config.md`](../../../.agents/rules/api-config.md).
