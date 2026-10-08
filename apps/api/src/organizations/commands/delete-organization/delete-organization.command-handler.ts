import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { Organization } from '../../domain/organization.types';
import type { OrganizationAuthPort } from '../../infrastructure/organization-auth.port';
import { ORGANIZATION_AUTH } from '../../organizations.di-tokens';
import { DeleteOrganizationCommand } from './delete-organization.command';

/**
 * Deletes an organization. Answers with the organization it deleted rather
 * than its id: the row is gone, so no query could read it back.
 */
@CommandHandler(DeleteOrganizationCommand)
export class DeleteOrganizationCommandHandler
  implements ICommandHandler<DeleteOrganizationCommand, Organization>
{
  constructor(
    @Inject(ORGANIZATION_AUTH)
    private readonly organizations: OrganizationAuthPort,
  ) {}

  execute({ headers, organizationId }: DeleteOrganizationCommand): Promise<Organization> {
    return this.organizations.delete(headers, organizationId);
  }
}
