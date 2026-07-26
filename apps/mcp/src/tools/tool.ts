import { hasAllScopes, missingScopes, type Scope } from '@flama/shared';
import type { ZodRawShape, z } from 'zod';
import type { FlamaClient } from '../client';

/** What a tool handler is given: the API client, and nothing else. */
export interface ToolContext {
  client: FlamaClient;
}

/**
 * Hints about a tool's behaviour, passed through to MCP clients so they can
 * decide what needs confirmation. They are advisory: the API enforces the real
 * rules regardless of what a client does with them.
 */
export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
}

export interface ToolDefinition<Shape extends ZodRawShape = ZodRawShape> {
  name: string;
  title: string;
  description: string;
  /**
   * Permissions a credential must carry for this tool to be offered at all.
   * The same scopes are what the API's `@RequireScopes` demands of the
   * underlying endpoint, so a tool that passes this filter will not be
   * refused for lack of scope later.
   */
  requiredScopes: Scope[];
  inputSchema: Shape;
  annotations?: ToolAnnotations;
  handler: (
    args: z.objectOutputType<Shape, z.ZodTypeAny>,
    context: ToolContext,
  ) => Promise<unknown>;
}

/** Helper that keeps each tool's argument types inferred from its schema. */
export function defineTool<Shape extends ZodRawShape>(
  definition: ToolDefinition<Shape>,
): ToolDefinition<Shape> {
  return definition;
}

/** The tools a credential with these scopes may use. */
export function allowedTools(
  tools: readonly ToolDefinition[],
  scopes: readonly Scope[],
): ToolDefinition[] {
  return tools.filter((tool) => hasAllScopes(scopes, tool.requiredScopes));
}

/** The scopes a tool needs that this credential is missing. */
export function unmetScopes(tool: ToolDefinition, scopes: readonly Scope[]): readonly Scope[] {
  return missingScopes(scopes, tool.requiredScopes);
}
