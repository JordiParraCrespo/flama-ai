#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { FlamaClient } from '../client';
import { loadConfig } from '../config';
import { createServer } from '../server';

/**
 * Local entrypoint: an MCP client (Claude Desktop, Claude Code, …) spawns this
 * process and speaks to it over stdio. The credential is a scoped API token
 * from `flama tokens create`.
 *
 * Nothing may be written to stdout except protocol messages — diagnostics go to
 * stderr, which MCP clients surface in their logs.
 */
async function main(): Promise<void> {
  const config = loadConfig();

  if (!config.apiToken) {
    throw new Error(
      'FLAMA_API_TOKEN is required. Create one with `flama tokens create --name "Claude" --permissions users:read` (or run `flama mcp install`).',
    );
  }

  const client = new FlamaClient({
    apiUrl: config.apiUrl,
    token: config.apiToken,
    timeoutMs: config.timeoutMs,
  });

  // Ask the API what this token can actually do, rather than trusting the
  // token's own claims or offering everything and failing later.
  const credential = await client.currentCredential();
  const { server, tools, withheld } = createServer({
    client,
    scopes: credential.effectiveScopes,
  });

  console.error(
    `[flama-mcp] connected to ${config.apiUrl} as ${credential.email} (${credential.kind})`,
  );
  console.error(
    `[flama-mcp] ${tools.length} tools available, ${withheld.length} withheld for lack of permissions`,
  );

  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  console.error(`[flama-mcp] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
