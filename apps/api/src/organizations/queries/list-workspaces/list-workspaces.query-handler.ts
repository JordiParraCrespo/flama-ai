import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { Workspace } from '../../domain/organization.types';
import type { WorkspaceAuthPort } from '../../infrastructure/workspace-auth.port';
import { WORKSPACE_AUTH } from '../../organizations.di-tokens';
import { ListWorkspacesQuery } from './list-workspaces.query';

/** An organization's workspaces; the session's organization when none is named. */
@QueryHandler(ListWorkspacesQuery)
export class ListWorkspacesQueryHandler implements IQueryHandler<ListWorkspacesQuery, Workspace[]> {
  constructor(
    @Inject(WORKSPACE_AUTH)
    private readonly workspaces: WorkspaceAuthPort,
  ) {}

  execute({ headers, organizationId }: ListWorkspacesQuery): Promise<Workspace[]> {
    return this.workspaces.listForOrganization(headers, organizationId);
  }
}
