import type { Scope } from '@flama/shared';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FlamaApiError, type FlamaClient } from './client';
import { ALL_TOOLS, allowedTools, type ToolDefinition, unmetScopes } from './tools';

export interface CreateServerOptions {
  client: FlamaClient;
  /**
   * The credential's effective scopes — what it was granted, intersected with
   * what its owner's roles still permit. Only tools covered by these are
   * registered, so `tools/list` never advertises something that would be
   * refused.
   */
  scopes: readonly Scope[];
  /** Overridable for tests. */
  tools?: readonly ToolDefinition[];
  version?: string;
}

export interface CreatedServer {
  server: McpServer;
  /** Tools registered for this credential. */
  tools: ToolDefinition[];
  /** Tools withheld, with the scopes that would unlock them. */
  withheld: { name: string; missingScopes: readonly Scope[] }[];
}

/**
 * Build an MCP server exposing exactly the tools this credential may use.
 *
 * Filtering happens at registration, so an agent is never shown a capability it
 * cannot exercise. The handler still re-checks before calling the API, and the
 * API enforces the same scopes independently — a bug here cannot turn into
 * unauthorized access, only into a missing tool.
 */
export function createServer(options: CreateServerOptions): CreatedServer {
  const catalog = options.tools ?? ALL_TOOLS;
  const scopes = options.scopes;
  const tools = allowedTools(catalog, scopes);

  const server = new McpServer(
    { name: 'flama', version: options.version ?? '0.1.0' },
    {
      capabilities: { tools: {} },
      instructions: [
        'Tools for administering a Flama deployment: users, roles and permissions,',
        'organizations, members, invitations and workspaces.',
        '',
        'This connection is limited to the permissions its credential was granted,',
        'so you are only shown tools it may actually use. If an expected tool is',
        'missing, call `whoami` to see the granted permissions and tell the user',
        'which one to add rather than guessing at a workaround.',
      ].join('\n'),
    },
  );

  // `registerTool` infers its handler's argument type from the schema given at
  // the call site. Here the schemas come from a registry only known at runtime,
  // so there is nothing to infer from; `defineTool` has already tied each
  // handler to its own schema.
  const register = server.registerTool.bind(server) as unknown as (
    name: string,
    config: Record<string, unknown>,
    handler: (args: Record<string, unknown>) => Promise<unknown>,
  ) => void;

  for (const tool of tools) {
    register(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: { title: tool.title, ...tool.annotations },
      },
      (args) => runTool(tool, args, options),
    );
  }

  const withheld = catalog
    .filter((tool) => !tools.includes(tool))
    .map((tool) => ({
      name: tool.name,
      missingScopes: unmetScopes(tool, scopes),
    }));

  return { server, tools, withheld };
}

async function runTool(
  tool: ToolDefinition,
  args: Record<string, unknown>,
  options: CreateServerOptions,
) {
  // Defence in depth: registration already filtered, but re-check so a future
  // refactor cannot quietly widen what a credential reaches.
  const missing = unmetScopes(tool, options.scopes);
  if (missing.length > 0) {
    return toolError(
      `This connection is missing the ${missing.join(', ')} permission${
        missing.length > 1 ? 's' : ''
      } needed for ${tool.name}. Ask the user to grant it on their API token, then reconnect.`,
    );
  }

  try {
    const result = await tool.handler(args, { client: options.client });
    return toolSuccess(result);
  } catch (error) {
    if (error instanceof FlamaApiError) {
      const suffix = error.correlationId ? ` (correlation id ${error.correlationId})` : '';
      const hint = error.isPermissionError
        ? ' The credential’s owner may have lost the role that allowed this.'
        : '';
      return toolError(`${error.message}${hint}${suffix}`);
    }
    return toolError(error instanceof Error ? error.message : String(error));
  }
}

function toolSuccess(result: unknown) {
  const text = result === undefined ? 'Done.' : JSON.stringify(result, null, 2);
  return {
    content: [{ type: 'text' as const, text }],
    // Structured output alongside the text, so clients that can consume JSON
    // do not have to parse the rendering.
    structuredContent: isRecord(result) ? result : { result: result ?? null },
  };
}

function toolError(message: string) {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
