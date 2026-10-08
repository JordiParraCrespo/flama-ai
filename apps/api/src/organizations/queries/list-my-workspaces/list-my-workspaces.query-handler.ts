import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { Workspace } from '../../domain/organization.types';
import type { WorkspaceAuthPort } from '../../infrastructure/workspace-auth.port';
import { WORKSPACE_AUTH } from '../../organizations.di-tokens';
import { ListMyWorkspacesQuery } from './list-my-workspaces.query';

/** The workspaces the caller belongs to. */
@QueryHandler(ListMyWorkspacesQuery)
export class ListMyWorkspacesQueryHandler
  implements IQueryHandler<ListMyWorkspacesQuery, Workspace[]>
{
  constructor(
    @Inject(WORKSPACE_AUTH)
    private readonly workspaces: WorkspaceAuthPort,
  ) {}

  execute({ headers }: ListMyWorkspacesQuery): Promise<Workspace[]> {
    return this.workspaces.listForCaller(headers);
  }
}
