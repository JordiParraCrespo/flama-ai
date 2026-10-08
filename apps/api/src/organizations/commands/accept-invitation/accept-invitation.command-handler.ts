import type { IncomingHttpHeaders } from 'node:http';
import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  MembershipAccessPolicy,
  type RosterEntry,
} from '../../application/membership-access.policy';
import type { InvitationRepositoryPort } from '../../database/invitation.repository.port';
import type { MemberRepositoryPort } from '../../database/member.repository.port';
import type { Invitation } from '../../domain/invitation.types';
import type { InvitationAuthPort } from '../../infrastructure/invitation-auth.port';
import type { OrganizationAuthPort } from '../../infrastructure/organization-auth.port';
import {
  INVITATION_AUTH,
  INVITATION_REPOSITORY,
  MEMBER_REPOSITORY,
  ORGANIZATION_AUTH,
} from '../../organizations.di-tokens';
import { AcceptInvitationCommand } from './accept-invitation.command';

/**
 * Accepts an invitation the caller was sent, with the application role its
 * organization role stands for — scoped to the organization, so an org admin
 * never becomes a platform-wide one — or not at all: a membership whose role
 * cannot be granted is left again. Answers the invitation's id.
 *
 * Accepting twice is safe. A retry whose first attempt Better Auth committed
 * (the response was lost, or a later client request failed) finds the
 * invitation accepted and the caller a member, and finishes the job instead of
 * failing on an invitation that is no longer pending.
 */
@CommandHandler(AcceptInvitationCommand)
export class AcceptInvitationCommandHandler
  implements ICommandHandler<AcceptInvitationCommand, AggregateID>
{
  constructor(
    @Inject(INVITATION_AUTH)
    private readonly invitationAuth: InvitationAuthPort,
    @Inject(ORGANIZATION_AUTH)
    private readonly organizations: OrganizationAuthPort,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitations: InvitationRepositoryPort,
    @Inject(MEMBER_REPOSITORY)
    private readonly members: MemberRepositoryPort,
    private readonly membershipAccess: MembershipAccessPolicy,
  ) {}

  async execute({ headers, invitationId }: AcceptInvitationCommand): Promise<AggregateID> {
    const replayed = await this.acceptedByCaller(headers, invitationId);
    if (replayed) {
      await this.organizations.setActive(headers, replayed.invitation.organizationId);
      // The membership predates this request, so there is nothing to undo.
      await this.membershipAccess.grant(rosterEntry(replayed.userId, replayed.invitation));
      return replayed.invitation.id;
    }

    const { invitation } = await this.membershipAccess.admit(
      async () => {
        const accepted = await this.invitationAuth.accept(headers, invitationId);
        return {
          ...rosterEntry(accepted.userId, accepted.invitation),
          invitation: accepted.invitation,
        };
      },
      (entry) => this.organizations.leave(headers, entry.organizationId),
    );
    return invitation.id;
  }

  /**
   * The invitation, when it is already accepted and the caller is who accepted
   * it. Recipient email plus the created membership prove the caller is
   * replaying their own acceptance, not claiming someone else's.
   */
  private async acceptedByCaller(
    headers: IncomingHttpHeaders,
    invitationId: string,
  ): Promise<{ invitation: Invitation; userId: string } | null> {
    const found = await this.invitations.findOneById(invitationId);
    if (found.isNone()) return null;
    const invitation = found.unwrap();
    if (invitation.status !== 'accepted') return null;

    const session = await this.organizations.session(headers);
    if (!session || invitation.email.toLowerCase() !== session.email.toLowerCase()) return null;

    const membership = await this.members.findMembership(invitation.organizationId, session.userId);
    if (membership.isNone()) return null;

    return { invitation, userId: session.userId };
  }
}

function rosterEntry(userId: string, invitation: Invitation): RosterEntry {
  return { userId, organizationId: invitation.organizationId, role: invitation.role ?? 'member' };
}
