import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { OrganizationAuthPort } from '../../infrastructure/organization-auth.port';
import { ORGANIZATION_AUTH } from '../../organizations.di-tokens';
import { SetActiveOrganizationCommand } from './set-active-organization.command';

/** Selects one of the caller's organizations for their session; Better Auth verifies membership. */
@CommandHandler(SetActiveOrganizationCommand)
export class SetActiveOrganizationCommandHandler
  implements ICommandHandler<SetActiveOrganizationCommand, AggregateID>
{
  constructor(
    @Inject(ORGANIZATION_AUTH)
    private readonly organizations: OrganizationAuthPort,
  ) {}

  async execute({ headers, organizationId }: SetActiveOrganizationCommand): Promise<AggregateID> {
    await this.organizations.setActive(headers, organizationId);
    return organizationId;
  }
}
