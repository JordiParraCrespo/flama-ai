import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { Invitation } from '../../domain/invitation.types';
import type { InvitationAuthPort } from '../../infrastructure/invitation-auth.port';
import { INVITATION_AUTH } from '../../organizations.di-tokens';
import { ListMyInvitationsQuery } from './list-my-invitations.query';

/** The pending invitations addressed to the caller's own email. */
@QueryHandler(ListMyInvitationsQuery)
export class ListMyInvitationsQueryHandler
  implements IQueryHandler<ListMyInvitationsQuery, Invitation[]>
{
  constructor(
    @Inject(INVITATION_AUTH)
    private readonly invitations: InvitationAuthPort,
  ) {}

  execute({ headers }: ListMyInvitationsQuery): Promise<Invitation[]> {
    return this.invitations.listForCaller(headers);
  }
}
