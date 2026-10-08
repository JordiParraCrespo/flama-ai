import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { InvitationAuthPort } from '../../infrastructure/invitation-auth.port';
import { INVITATION_AUTH } from '../../organizations.di-tokens';
import { InviteMemberCommand } from './invite-member.command';

/** Invites someone to an organization by email. Answers the invitation's id. */
@CommandHandler(InviteMemberCommand)
export class InviteMemberCommandHandler
  implements ICommandHandler<InviteMemberCommand, AggregateID>
{
  constructor(
    @Inject(INVITATION_AUTH)
    private readonly invitations: InvitationAuthPort,
  ) {}

  async execute({ headers, organizationId, input }: InviteMemberCommand): Promise<AggregateID> {
    const invitation = await this.invitations.invite(headers, organizationId, input);
    return invitation.id;
  }
}
