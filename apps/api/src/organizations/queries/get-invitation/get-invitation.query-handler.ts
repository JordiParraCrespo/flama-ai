import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { Invitation } from '../../domain/invitation.types';
import type { InvitationAuthPort } from '../../infrastructure/invitation-auth.port';
import { INVITATION_AUTH } from '../../organizations.di-tokens';
import { GetInvitationQuery } from './get-invitation.query';

/** An invitation the caller was sent; Better Auth checks the recipient. */
@QueryHandler(GetInvitationQuery)
export class GetInvitationQueryHandler implements IQueryHandler<GetInvitationQuery, Invitation> {
  constructor(
    @Inject(INVITATION_AUTH)
    private readonly invitations: InvitationAuthPort,
  ) {}

  execute({ headers, invitationId }: GetInvitationQuery): Promise<Invitation> {
    return this.invitations.get(headers, invitationId);
  }
}
