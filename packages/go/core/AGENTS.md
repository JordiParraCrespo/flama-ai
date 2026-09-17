# @flama/go-core — Agent Instructions

> Read the root [`CLAUDE.md`](../../../CLAUDE.md) first.

The base of the Go toolkit: RFC 7807 problems and the slog logger. Every
service and every sibling module imports it, so a change here re-runs
everything above it in Turborepo.

## Where things go

- A problem every Go service can raise goes in the shared catalog at the
  bottom of `problem/problem.go` (`RUNNER_00n`). A problem one context raises
  goes in that context's `domain/errors.go`, not here.
- New wire members of the document belong on `problem.Details` and must
  match `packages/backend/core/src/errors/problem-details.ts`; the two are
  kept identical on purpose.
- Logger setup lives in `logging/logging.go`; it takes an `Options` struct
  and never reads the environment.
- Tests sit next to the code (`problem/problem_test.go`).

## Before pushing

```bash
pnpm --filter @flama/go-core lint
pnpm --filter @flama/go-core test
pnpm --filter @flama/go-core build
```

## Patterns agents get wrong

- Building a `problem.Error` literal by hand instead of `problem.New` (a
  catalog entry, package-level) plus `WithDetail` per request. The title is
  the stable catalog message; specifics go in `Detail`.
- Adding a code without its row under "Runner service" in
  `apps/docs/docs/errors.md`. The `type` URI resolves to that page.
- Importing `httpx` from here to get at the request id. `httpx` imports this
  package; that is why `WithCorrelationID` lives here and takes a context.
- Mutating a catalog value (`ErrNotFound.Detail = …`). The `With*` methods
  return copies for a reason: the sentinel is shared across requests.

See [`.agents/rules/go.md`](../../../.agents/rules/go.md).
