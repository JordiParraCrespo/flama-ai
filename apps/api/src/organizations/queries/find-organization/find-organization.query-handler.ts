import { AppError } from '@flama/backend-core';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { OrganizationRepositoryPort } from '../../database/organization.repository.port';
import { OrganizationErrors } from '../../domain/organization.errors';
import type { Organization } from '../../domain/organization.types';
import { ORGANIZATION_REPOSITORY } from '../../organizations.di-tokens';
import { FindOrganizationQuery } from './find-organization.query';

/** One organization, for a command's controller to answer with what it just wrote. */
@QueryHandler(FindOrganizationQuery)
export class FindOrganizationQueryHandler
  implements IQueryHandler<FindOrganizationQuery, Organization>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizations: OrganizationRepositoryPort,
  ) {}

  async execute({ organizationId }: FindOrganizationQuery): Promise<Organization> {
    const found = await this.organizations.findOrganization(organizationId);
    if (found.isNone()) throw new AppError(OrganizationErrors.NOT_FOUND);
    return found.unwrap();
  }
}
