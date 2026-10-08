import { AppError } from '@flama/backend-core';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { InvitationRepositoryPort } from '../../database/invitation.repository.port';
import type { Invitation } from '../../domain/invitation.types';
import { OrganizationErrors } from '../../domain/organization.errors';
import { INVITATION_REPOSITORY } from '../../organizations.di-tokens';
import { FindInvitationQuery } from './find-invitation.query';

/**
 * One invitation, whatever its status, for a command's controller to answer
 * with what it just wrote: Better Auth keeps an answered or cancelled
 * invitation as a row with that status.
 */
@QueryHandler(FindInvitationQuery)
export class FindInvitationQueryHandler implements IQueryHandler<FindInvitationQuery, Invitation> {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitations: InvitationRepositoryPort,
  ) {}

  async execute({ invitationId }: FindInvitationQuery): Promise<Invitation> {
    const found = await this.invitations.findOneById(invitationId);
    if (found.isNone()) throw new AppError(OrganizationErrors.INVITATION_NOT_FOUND);
    return found.unwrap();
  }
}
