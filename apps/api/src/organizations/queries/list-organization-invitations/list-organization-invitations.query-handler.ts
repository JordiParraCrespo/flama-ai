import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { Invitation } from '../../domain/invitation.types';
import type { InvitationAuthPort } from '../../infrastructure/invitation-auth.port';
import { INVITATION_AUTH } from '../../organizations.di-tokens';
import { ListOrganizationInvitationsQuery } from './list-organization-invitations.query';

/** An organization's pending invitations. */
@QueryHandler(ListOrganizationInvitationsQuery)
export class ListOrganizationInvitationsQueryHandler
  implements IQueryHandler<ListOrganizationInvitationsQuery, Invitation[]>
{
  constructor(
    @Inject(INVITATION_AUTH)
    private readonly invitations: InvitationAuthPort,
  ) {}

  execute({ headers, organizationId }: ListOrganizationInvitationsQuery): Promise<Invitation[]> {
    return this.invitations.listForOrganization(headers, organizationId);
  }
}
