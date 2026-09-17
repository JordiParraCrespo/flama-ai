# @flama/go-httpx — Agent Instructions

> Read the root [`CLAUDE.md`](../../../CLAUDE.md) first.

Router, middleware, JSON helpers and server lifecycle on plain `net/http`.
Everything that touches a request in a Go service passes through here.

## Where things go

- A cross-cutting middleware (one every service wants) is a `Middleware`
  constructor in `middleware.go`; the composition root orders it in
  `Router.Use`. A middleware that knows about credentials belongs in
  `packages/go/auth`, not here.
- Body and response helpers go in `json.go` and return `*problem.Error`
  values from the shared catalog.
- Listener options are fields on `ServerOptions` in `server.go`; the service
  fills them from its config.
- Tests go in `httpx_test.go`, using `httptest` and the `discardLogger`
  helper in `testing_test.go`.

## Before pushing

```bash
pnpm --filter @flama/go-httpx lint
pnpm --filter @flama/go-httpx test
pnpm --filter @flama/go-httpx build
```

## Patterns agents get wrong

- Writing an error body from a handler (`http.Error`, a JSON `{"error":…}`).
  Handlers are `HandlerFunc` and return the error; `Router.Wrap` renders it
  through `problem.Writer`.
- Adding `WriteTimeout` to the `http.Server` in `Serve`. It kills WebSocket
  and streaming connections; bound headers with `ReadHeaderTimeout` and
  bodies with `MaxBytes` instead.
- Registering a route on the mux directly to skip the stack, or using a
  framework's router. Groups inherit the parent stack; `chi` is the only
  acceptable addition if `Router` ever runs out.
- Reaching for a `RealIP` with more hops than there are trusted proxies. With
  zero hops the header is ignored, which is what stops spoofing.

See [`.agents/rules/go.md`](../../../.agents/rules/go.md).
