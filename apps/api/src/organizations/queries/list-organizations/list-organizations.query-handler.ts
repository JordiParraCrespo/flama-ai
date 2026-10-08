import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { Organization } from '../../domain/organization.types';
import type { OrganizationAuthPort } from '../../infrastructure/organization-auth.port';
import { ORGANIZATION_AUTH } from '../../organizations.di-tokens';
import { ListOrganizationsQuery } from './list-organizations.query';

/**
 * The caller's organizations, the session's selected one first.
 *
 * Consumers that do not yet render an organization switcher use the first
 * item. Put the session's selected organization there instead of relying on
 * Better Auth's membership creation order (an invited user also owns an
 * automatically provisioned personal organization).
 */
@QueryHandler(ListOrganizationsQuery)
export class ListOrganizationsQueryHandler
  implements IQueryHandler<ListOrganizationsQuery, Organization[]>
{
  constructor(
    @Inject(ORGANIZATION_AUTH)
    private readonly organizations: OrganizationAuthPort,
  ) {}

  async execute({ headers }: ListOrganizationsQuery): Promise<Organization[]> {
    const [organizations, session] = await Promise.all([
      this.organizations.list(headers),
      this.organizations.session(headers),
    ]);
    const activeOrganizationId = session?.activeOrganizationId;
    if (!activeOrganizationId) return organizations;

    return [...organizations].sort((left, right) =>
      left.id === activeOrganizationId ? -1 : right.id === activeOrganizationId ? 1 : 0,
    );
  }
}
