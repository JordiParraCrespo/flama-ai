import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { MembershipAccessPolicy } from '../../application/membership-access.policy';
import type { Member } from '../../domain/membership.types';
import type { OrganizationAuthPort } from '../../infrastructure/organization-auth.port';
import { ORGANIZATION_AUTH } from '../../organizations.di-tokens';
import { RemoveMemberCommand } from './remove-member.command';

/**
 * Takes someone off an organization's roster, and everything the organization
 * gave them with it: their roles, grants and a session still acting in it.
 *
 * Answers with the membership it ended rather than its id: the row is gone,
 * so no query could read it back.
 */
@CommandHandler(RemoveMemberCommand)
export class RemoveMemberCommandHandler implements ICommandHandler<RemoveMemberCommand, Member> {
  constructor(
    @Inject(ORGANIZATION_AUTH)
    private readonly organizations: OrganizationAuthPort,
    private readonly membershipAccess: MembershipAccessPolicy,
  ) {}

  async execute(command: RemoveMemberCommand): Promise<Member> {
    const { headers, organizationId, memberIdOrEmail } = command;
    const member = await this.organizations.removeMember(headers, organizationId, memberIdOrEmail);
    return this.membershipAccess.release(member);
  }
}
