import type { IncomingHttpHeaders } from 'node:http';
import type { Workspace, WorkspaceMember } from '../domain/organization.types';

/**
 * What the workspace use cases need from the identity provider. A workspace is
 * a Better Auth team inside an organization; the provider owns the `team` and
 * `teamMember` tables and checks, from the request's headers, that the caller
 * may manage them.
 */
export interface WorkspaceAuthPort {
  /** In `organizationId`, or the session's organization when none is named. */
  create(
    headers: IncomingHttpHeaders,
    input: { name: string; organizationId?: string },
  ): Promise<Workspace>;
  rename(headers: IncomingHttpHeaders, teamId: string, name: string): Promise<Workspace>;
  remove(headers: IncomingHttpHeaders, teamId: string): Promise<void>;
  /** Select the session's workspace; `null` when the provider cleared it. */
  setActive(headers: IncomingHttpHeaders, teamId: string): Promise<Workspace | null>;
  /** An organization's workspaces; the session's organization when none is named. */
  listForOrganization(headers: IncomingHttpHeaders, organizationId?: string): Promise<Workspace[]>;
  listForCaller(headers: IncomingHttpHeaders): Promise<Workspace[]>;
  listMembers(headers: IncomingHttpHeaders, teamId: string): Promise<WorkspaceMember[]>;
  addMember(headers: IncomingHttpHeaders, teamId: string, userId: string): Promise<WorkspaceMember>;
  removeMember(headers: IncomingHttpHeaders, teamId: string, userId: string): Promise<void>;
}
