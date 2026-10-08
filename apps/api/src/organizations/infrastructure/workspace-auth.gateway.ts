import type { IncomingHttpHeaders } from 'node:http';
import { Injectable } from '@nestjs/common';
import { auth } from '../../auth/infrastructure/better-auth.config';
import { betterAuthHeaders } from '../../auth/infrastructure/better-auth.util';
import type { Workspace, WorkspaceMember } from '../domain/organization.types';
import { OrganizationMapper } from '../organization.mapper';
import { invokeOrganizationApi } from './organization-error.util';
import type { WorkspaceAuthPort } from './workspace-auth.port';

/**
 * The workspace port, over the Better Auth organization plugin's team
 * endpoints. "Workspaces" are Better Auth teams scoped to an organization.
 */
@Injectable()
export class WorkspaceAuthGateway implements WorkspaceAuthPort {
  async create(
    headers: IncomingHttpHeaders,
    input: { name: string; organizationId?: string },
  ): Promise<Workspace> {
    const result = await invokeOrganizationApi(() =>
      auth.api.createTeam({
        body: { name: input.name, organizationId: input.organizationId },
        headers: betterAuthHeaders(headers),
      }),
    );
    return OrganizationMapper.toWorkspace(result);
  }

  async rename(headers: IncomingHttpHeaders, teamId: string, name: string): Promise<Workspace> {
    const result = await invokeOrganizationApi(() =>
      auth.api.updateTeam({
        body: { teamId, data: { name } },
        headers: betterAuthHeaders(headers),
      }),
    );
    return OrganizationMapper.toWorkspace(result);
  }

  async remove(headers: IncomingHttpHeaders, teamId: string): Promise<void> {
    await invokeOrganizationApi(() =>
      auth.api.removeTeam({ body: { teamId }, headers: betterAuthHeaders(headers) }),
    );
  }

  async setActive(headers: IncomingHttpHeaders, teamId: string): Promise<Workspace | null> {
    const result = await invokeOrganizationApi(() =>
      auth.api.setActiveTeam({
        body: { teamId },
        headers: betterAuthHeaders(headers),
      }),
    );
    return result ? OrganizationMapper.toWorkspace(result) : null;
  }

  async listForOrganization(
    headers: IncomingHttpHeaders,
    organizationId?: string,
  ): Promise<Workspace[]> {
    const result = await invokeOrganizationApi(() =>
      auth.api.listOrganizationTeams({
        query: organizationId ? { organizationId } : {},
        headers: betterAuthHeaders(headers),
      }),
    );
    return OrganizationMapper.toWorkspaces(result);
  }

  async listForCaller(headers: IncomingHttpHeaders): Promise<Workspace[]> {
    const result = await invokeOrganizationApi(() =>
      auth.api.listUserTeams({ headers: betterAuthHeaders(headers) }),
    );
    return OrganizationMapper.toWorkspaces(result);
  }

  async listMembers(headers: IncomingHttpHeaders, teamId: string): Promise<WorkspaceMember[]> {
    const result = await invokeOrganizationApi(() =>
      auth.api.listTeamMembers({
        query: { teamId },
        headers: betterAuthHeaders(headers),
      }),
    );
    return OrganizationMapper.toWorkspaceMembers(result);
  }

  async addMember(
    headers: IncomingHttpHeaders,
    teamId: string,
    userId: string,
  ): Promise<WorkspaceMember> {
    const result = await invokeOrganizationApi(() =>
      auth.api.addTeamMember({
        body: { teamId, userId },
        headers: betterAuthHeaders(headers),
      }),
    );
    return OrganizationMapper.toWorkspaceMember(result);
  }

  async removeMember(headers: IncomingHttpHeaders, teamId: string, userId: string): Promise<void> {
    await invokeOrganizationApi(() =>
      auth.api.removeTeamMember({
        body: { teamId, userId },
        headers: betterAuthHeaders(headers),
      }),
    );
  }
}
