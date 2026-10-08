import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { WorkspaceMember } from '../../domain/organization.types';
import type { WorkspaceAuthPort } from '../../infrastructure/workspace-auth.port';
import { WORKSPACE_AUTH } from '../../organizations.di-tokens';
import { ListWorkspaceMembersQuery } from './list-workspace-members.query';

/** The members of a workspace. */
@QueryHandler(ListWorkspaceMembersQuery)
export class ListWorkspaceMembersQueryHandler
  implements IQueryHandler<ListWorkspaceMembersQuery, WorkspaceMember[]>
{
  constructor(
    @Inject(WORKSPACE_AUTH)
    private readonly workspaces: WorkspaceAuthPort,
  ) {}

  execute({ headers, workspaceId }: ListWorkspaceMembersQuery): Promise<WorkspaceMember[]> {
    return this.workspaces.listMembers(headers, workspaceId);
  }
}
