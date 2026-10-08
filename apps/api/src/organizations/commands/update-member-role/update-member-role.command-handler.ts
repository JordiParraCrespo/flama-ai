import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { MembershipAccessPolicy } from '../../application/membership-access.policy';
import type { OrganizationAuthPort } from '../../infrastructure/organization-auth.port';
import { ORGANIZATION_AUTH } from '../../organizations.di-tokens';
import { UpdateMemberRoleCommand } from './update-member-role.command';

/**
 * Changes a member's organization role and the application role that stands
 * for it. Answers the member's id.
 */
@CommandHandler(UpdateMemberRoleCommand)
export class UpdateMemberRoleCommandHandler
  implements ICommandHandler<UpdateMemberRoleCommand, AggregateID>
{
  constructor(
    @Inject(ORGANIZATION_AUTH)
    private readonly organizations: OrganizationAuthPort,
    private readonly membershipAccess: MembershipAccessPolicy,
  ) {}

  async execute(command: UpdateMemberRoleCommand): Promise<AggregateID> {
    const { headers, organizationId, memberId, role } = command;
    const member = await this.organizations.updateMemberRole(
      headers,
      organizationId,
      memberId,
      role,
    );
    await this.membershipAccess.grant(member.userId, organizationId, member.role);
    return member.id;
  }
}
