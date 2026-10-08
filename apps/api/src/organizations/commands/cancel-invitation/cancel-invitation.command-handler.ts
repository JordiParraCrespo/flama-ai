import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { InvitationAuthPort } from '../../infrastructure/invitation-auth.port';
import { INVITATION_AUTH } from '../../organizations.di-tokens';
import { CancelInvitationCommand } from './cancel-invitation.command';

/**
 * Withdraws an invitation the organization issued. Better Auth keeps it as a
 * `canceled` row rather than deleting it. Answers the invitation's id.
 */
@CommandHandler(CancelInvitationCommand)
export class CancelInvitationCommandHandler
  implements ICommandHandler<CancelInvitationCommand, AggregateID>
{
  constructor(
    @Inject(INVITATION_AUTH)
    private readonly invitations: InvitationAuthPort,
  ) {}

  async execute({ headers, invitationId }: CancelInvitationCommand): Promise<AggregateID> {
    const invitation = await this.invitations.cancel(headers, invitationId);
    return invitation.id;
  }
}
