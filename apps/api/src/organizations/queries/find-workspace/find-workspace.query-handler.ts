import { AppError } from '@flama/backend-core';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { OrganizationRepositoryPort } from '../../database/organization.repository.port';
import { OrganizationErrors } from '../../domain/organization.errors';
import type { Workspace } from '../../domain/organization.types';
import { ORGANIZATION_REPOSITORY } from '../../organizations.di-tokens';
import { FindWorkspaceQuery } from './find-workspace.query';

/** One workspace, for a command's controller to answer with what it just wrote. */
@QueryHandler(FindWorkspaceQuery)
export class FindWorkspaceQueryHandler implements IQueryHandler<FindWorkspaceQuery, Workspace> {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizations: OrganizationRepositoryPort,
  ) {}

  async execute({ workspaceId }: FindWorkspaceQuery): Promise<Workspace> {
    const found = await this.organizations.findWorkspace(workspaceId);
    if (found.isNone()) throw new AppError(OrganizationErrors.TEAM_NOT_FOUND);
    return found.unwrap();
  }
}
