# @flama/mcp — Agent Instructions

MCP (Model Context Protocol) server exposing Flama's API to MCP clients over
**stdio** and **Streamable HTTP**, speaking protocol revision **`2026-07-28`**.

> Read the root [`CLAUDE.md`](../../CLAUDE.md) first for repo-wide conventions.

## Stack

- **@modelcontextprotocol/server** (SDK v2) server, built in `src/server.ts`;
  the HTTP entry bridges it onto Express with `@modelcontextprotocol/node`
- Two entrypoints, one server: `src/bin/stdio.ts` (local clients) and
  `src/bin/http.ts` (Streamable HTTP)
- **Zod 4** here only. The rest of the monorepo is still on Zod 3; the SDK v2
  requires 4, and `apps/mcp` imports no Zod schemas from `@flama/shared`, so
  the bump stops at this package
- Talks to the API over HTTP via `src/client.ts`
- Access is governed by the **scope catalog** in `@flama/shared`
  (`packages/shared/src/scopes/`)

## Layout

```
src/
├── bin/
│   ├── stdio.ts          # stdio entrypoint (default `flama-mcp` binary)
│   └── http.ts           # Streamable HTTP entrypoint
├── server.ts             # server construction + tool registration
├── tools/                # the single tool registry
│   ├── tool.ts           # tool definition helper
│   ├── index.ts          # registry — register new tools here
│   └── *.tools.ts        # one file per domain (admin, orgs, roles, users, workspaces)
├── client.ts
├── config.ts
└── __tests__/
```

## Conventions

- **One tool registry, two entrypoints.** Both binaries build the same server —
  never register a tool on only one transport.
- **Every tool declares `requiredScopes`.** The advertised tool list is filtered
  by the credential's effective scopes, so a tool without scopes is either
  invisible or over-exposed. Declare the _same_ scope the underlying endpoint
  requires via `@RequireScopes`.
  Mismatched scopes mean a tool that is offered but then refused — the one
  failure mode the design exists to prevent.
- New tools go in the matching `src/tools/*.tools.ts` and are added to the
  registry in `src/tools/index.ts`.
- `inputSchema` is a Zod **object schema** (`z.object({ … })`), not a raw
  shape. Do not import Zod schemas from `@flama/shared`: that is what keeps
  this package's Zod 4 from meeting the rest of the repo's Zod 3.
- The server is built **per request** from the calling credential, because
  protocol revision `2026-07-28` removed sessions: there is nowhere to cache
  the decision, and nowhere it could go stale. `tools/list` is sorted by name
  (the spec asks for a deterministic order) and returned with
  `cacheScope: 'private'`, since the list is derived from one credential's
  permissions.
- Annotate honestly: `readOnlyHint` only for tools whose scopes are all
  `:read`, `destructiveHint` for anything that deletes or is irreversible.
  `src/__tests__/server.spec.ts` enforces both.
- Adding an API endpoint you want reachable here means declaring its scope on
  the controller first — see `.agents/rules/scopes-and-credentials.md`.

## Commands

```bash
pnpm --filter @flama/mcp build
pnpm --filter @flama/mcp dev         # tsc --watch
pnpm --filter @flama/mcp start       # stdio transport
pnpm --filter @flama/mcp start:http  # Streamable HTTP transport
pnpm --filter @flama/mcp test
pnpm --filter @flama/mcp lint
```
