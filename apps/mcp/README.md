# @flama/mcp

Model Context Protocol server for the Flama API, with per-tool permissions.

An agent connected to this server only sees the tools its credential may
actually use. Nothing is hidden by convention: the tool list is filtered from
the credential's **effective scopes** (what it was granted, intersected with
what its owner's roles still permit), and the API enforces the same scopes
independently on every call.

## Two entrypoints, one tool registry

| Entrypoint | Command           | Credential                           | Use it for                           |
| ---------- | ----------------- | ------------------------------------ | ------------------------------------ |
| stdio      | `pnpm start`      | Scoped API token (`FLAMA_API_TOKEN`) | Local clients: Claude Desktop / Code |
| HTTP       | `pnpm start:http` | Per-request OAuth 2.1 or API token   | A hosted server serving many users   |

Tools are declared once in `src/tools/` and gated identically on both.

## Quick start (local)

```bash
# 1. Mint a token with only the permissions the agent needs
flama tokens create --name "Claude" --permissions users:read,roles:read

# 2. Register the server with your MCP client
flama mcp install --client claude-code
```

Or configure it by hand:

```json
{
  "mcpServers": {
    "flama": {
      "command": "node",
      "args": ["/path/to/flama/apps/mcp/dist/bin/stdio.js"],
      "env": {
        "FLAMA_API_URL": "http://localhost:3001",
        "FLAMA_API_TOKEN": "flama_pat_…"
      }
    }
  }
}
```

## Remote (OAuth)

`pnpm start:http` serves Streamable HTTP on `/mcp`. Requests without a valid
bearer token get a `401` carrying `WWW-Authenticate: Bearer resource_metadata=…`,
which points the client at the API's OAuth metadata; the client then registers
itself, sends the user through the consent screen, and returns with an access
token carrying only the scopes the user approved.

| Variable                | Default                 | Meaning                                 |
| ----------------------- | ----------------------- | --------------------------------------- |
| `FLAMA_API_URL`         | `http://localhost:3001` | Base URL of the Flama API               |
| `FLAMA_API_TOKEN`       | —                       | Token for the stdio entrypoint          |
| `PORT`                  | `3005`                  | Port for the HTTP entrypoint            |
| `FLAMA_TIMEOUT_MS`      | `30000`                 | Per-request timeout against the API     |
| `FLAMA_ALLOWED_ORIGINS` | _(none)_                | Browser origins allowed to reach `/mcp` |

## Adding a tool

Add it to the right file in `src/tools/`, declaring the scopes it needs:

```ts
defineTool({
  name: "archive_project",
  title: "Archive a project",
  description: "Archive a project. Archived projects stay readable.",
  requiredScopes: ["projects:write"],
  inputSchema: { id: z.string().uuid() },
  annotations: { idempotentHint: true },
  handler: ({ id }, { client }) => client.post(`/projects/${id}/archive`),
});
```

The scope must exist in `@flama/shared`'s catalog and the endpoint must declare
the same one via `@RequireScopes`, so the tool is offered exactly when it will
work.
