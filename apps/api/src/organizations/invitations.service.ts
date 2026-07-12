import type { IncomingHttpHeaders } from 'node:http';
import type { InviteMemberDto } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import { auth } from '../auth/auth';
import { betterAuthHeaders, invokeBetterAuth, unwrap } from '../auth/better-auth.util';
import type { InvitationResponseDto } from './dtos/organization.response.dto';
import { mapInvitation, mapInvitations } from './organization.mappers';

/** Delegating façade over the Better Auth organization plugin's invitation endpoints. */
@Injectable()
export class InvitationsService {
  private headers(headers: IncomingHttpHeaders): Headers {
    return betterAuthHeaders(headers);
  }

  async invite(
    headers: IncomingHttpHeaders,
    organizationId: string,
    dto: InviteMemberDto,
  ): Promise<InvitationResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.createInvitation({
        body: {
          email: dto.email,
          role: dto.role,
          organizationId,
          teamId: dto.teamId,
        },
        headers: this.headers(headers),
      }),
    );
    return mapInvitation(result);
  }

  async accept(headers: IncomingHttpHeaders, invitationId: string): Promise<InvitationResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.acceptInvitation({
        body: { invitationId },
        headers: this.headers(headers),
      }),
    );
    return mapInvitation(unwrap(result, 'invitation'));
  }

  async reject(headers: IncomingHttpHeaders, invitationId: string): Promise<InvitationResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.rejectInvitation({
        body: { invitationId },
        headers: this.headers(headers),
      }),
    );
    return mapInvitation(unwrap(result, 'invitation'));
  }

  async cancel(headers: IncomingHttpHeaders, invitationId: string): Promise<InvitationResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.cancelInvitation({
        body: { invitationId },
        headers: this.headers(headers),
      }),
    );
    return mapInvitation(result);
  }

  async get(headers: IncomingHttpHeaders, invitationId: string): Promise<InvitationResponseDto> {
    const result = await invokeBetterAuth(() =>
      auth.api.getInvitation({
        query: { id: invitationId },
        headers: this.headers(headers),
      }),
    );
    return mapInvitation(result);
  }

  async listForOrganization(
    headers: IncomingHttpHeaders,
    organizationId: string,
  ): Promise<InvitationResponseDto[]> {
    const result = await invokeBetterAuth(() =>
      auth.api.listInvitations({
        query: { organizationId },
        headers: this.headers(headers),
      }),
    );
    return mapInvitations(result);
  }

  async listForCaller(headers: IncomingHttpHeaders): Promise<InvitationResponseDto[]> {
    const result = await invokeBetterAuth(() =>
      auth.api.listUserInvitations({ headers: this.headers(headers) }),
    );
    return mapInvitations(result);
  }
}
