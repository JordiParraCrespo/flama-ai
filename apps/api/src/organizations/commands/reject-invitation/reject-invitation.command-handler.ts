import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { InvitationAuthPort } from '../../infrastructure/invitation-auth.port';
import { INVITATION_AUTH } from '../../organizations.di-tokens';
import { RejectInvitationCommand } from './reject-invitation.command';

/** Declines an invitation the caller was sent. Answers the invitation's id. */
@CommandHandler(RejectInvitationCommand)
export class RejectInvitationCommandHandler
  implements ICommandHandler<RejectInvitationCommand, AggregateID>
{
  constructor(
    @Inject(INVITATION_AUTH)
    private readonly invitations: InvitationAuthPort,
  ) {}

  async execute({ headers, invitationId }: RejectInvitationCommand): Promise<AggregateID> {
    const invitation = await this.invitations.reject(headers, invitationId);
    return invitation.id;
  }
}
