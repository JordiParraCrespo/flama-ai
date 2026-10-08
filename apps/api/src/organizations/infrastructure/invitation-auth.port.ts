import type { IncomingHttpHeaders } from 'node:http';
import type { InviteMemberDto } from '@flama/shared';
import type { Invitation } from '../domain/invitation.types';

/** An accepted invitation, and the account whose membership it created. */
export interface AcceptedInvitation {
  invitation: Invitation;
  userId: string;
}

/**
 * What the invitation use cases need from the identity provider, which owns
 * the `invitation` table and checks, from the incoming request's headers, that
 * the caller may issue an invitation or is the one it was sent to.
 *
 * The lists answer pending invitations only: the provider keeps a cancelled or
 * answered one as a row with another status, and nobody asking for "the
 * invitations" means those.
 */
export interface InvitationAuthPort {
  invite(
    headers: IncomingHttpHeaders,
    organizationId: string,
    input: InviteMemberDto,
  ): Promise<Invitation>;
  accept(headers: IncomingHttpHeaders, invitationId: string): Promise<AcceptedInvitation>;
  reject(headers: IncomingHttpHeaders, invitationId: string): Promise<Invitation>;
  cancel(headers: IncomingHttpHeaders, invitationId: string): Promise<Invitation>;
  get(headers: IncomingHttpHeaders, invitationId: string): Promise<Invitation>;
  listForOrganization(headers: IncomingHttpHeaders, organizationId: string): Promise<Invitation[]>;
  listForCaller(headers: IncomingHttpHeaders): Promise<Invitation[]>;
}
