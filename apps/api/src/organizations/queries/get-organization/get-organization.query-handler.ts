import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { FullOrganization } from '../../domain/organization.types';
import type { OrganizationAuthPort } from '../../infrastructure/organization-auth.port';
import { ORGANIZATION_AUTH } from '../../organizations.di-tokens';
import { GetOrganizationQuery } from './get-organization.query';

/** An organization with its members, invitations and workspaces; `null` when there is none. */
@QueryHandler(GetOrganizationQuery)
export class GetOrganizationQueryHandler
  implements IQueryHandler<GetOrganizationQuery, FullOrganization | null>
{
  constructor(
    @Inject(ORGANIZATION_AUTH)
    private readonly organizations: OrganizationAuthPort,
  ) {}

  execute({ headers, organizationId }: GetOrganizationQuery): Promise<FullOrganization | null> {
    return this.organizations.getFull(headers, organizationId);
  }
}
