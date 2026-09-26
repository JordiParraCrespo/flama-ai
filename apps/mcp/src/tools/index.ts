import { adminTools } from './admin.tools';
import { flagTools } from './flags.tools';
// flama:begin organizations
import { organizationTools } from './organizations.tools';
// flama:end organizations
// flama:plugins tenancy-tool-imports
import { roleTools } from './roles.tools';
import type { ToolDefinition } from './tool';
import { userTools } from './users.tools';

// flama:begin organizations
import { workspaceTools } from './workspaces.tools';
// flama:end organizations
// flama:plugins workspace-tool-imports

/**
 * Every tool this server can offer, in one registry.
 *
 * Both entrypoints — stdio and Streamable HTTP — build their tool list from
 * here by filtering on the calling credential's scopes, so a tool is written
 * once and is correctly gated on both transports.
 */
export const ALL_TOOLS: readonly ToolDefinition[] = [
  ...userTools,
  ...roleTools,
  // flama:begin organizations
  ...organizationTools,
  ...workspaceTools,
  // flama:end organizations
  // flama:plugins tenancy-tools
  ...adminTools,
  ...flagTools,
] as ToolDefinition[];

export * from './tool';
