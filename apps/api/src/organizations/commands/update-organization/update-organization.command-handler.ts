import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { OrganizationAuthPort } from '../../infrastructure/organization-auth.port';
import { ORGANIZATION_AUTH } from '../../organizations.di-tokens';
import { UpdateOrganizationCommand } from './update-organization.command';

@CommandHandler(UpdateOrganizationCommand)
export class UpdateOrganizationCommandHandler
  implements ICommandHandler<UpdateOrganizationCommand, AggregateID>
{
  constructor(
    @Inject(ORGANIZATION_AUTH)
    private readonly organizations: OrganizationAuthPort,
  ) {}

  async execute({
    headers,
    organizationId,
    input,
  }: UpdateOrganizationCommand): Promise<AggregateID> {
    const organization = await this.organizations.update(headers, organizationId, input);
    return organization.id;
  }
}
