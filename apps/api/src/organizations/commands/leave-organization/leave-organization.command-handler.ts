import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { MembershipAccessPolicy } from '../../application/membership-access.policy';
import type { MemberRepositoryPort } from '../../database/member.repository.port';
import type { Member } from '../../domain/membership.types';
import type { OrganizationAuthPort } from '../../infrastructure/organization-auth.port';
import { OrganizationMapper } from '../../organization.mapper';
import { MEMBER_REPOSITORY, ORGANIZATION_AUTH } from '../../organizations.di-tokens';
import { LeaveOrganizationCommand } from './leave-organization.command';

/**
 * Ends the caller's own membership, and everything the organization gave them
 * with it. Better Auth refuses the last owner.
 *
 * Answers with the membership it ended rather than its id: the row is gone,
 * so no query could read it back.
 */
@CommandHandler(LeaveOrganizationCommand)
export class LeaveOrganizationCommandHandler
  implements ICommandHandler<LeaveOrganizationCommand, Member>
{
  constructor(
    @Inject(ORGANIZATION_AUTH)
    private readonly organizations: OrganizationAuthPort,
    @Inject(MEMBER_REPOSITORY)
    private readonly members: MemberRepositoryPort,
    private readonly membershipAccess: MembershipAccessPolicy,
  ) {}

  async execute({ headers, organizationId }: LeaveOrganizationCommand): Promise<Member> {
    const member = await this.organizations.leave(headers, organizationId);
    await this.membershipAccess.revoke(member.userId, organizationId);
    const [withAccount] = OrganizationMapper.withAccounts(
      [member],
      await this.members.findAccounts([member.userId]),
    );
    return withAccount;
  }
}
