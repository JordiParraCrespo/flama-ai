import { AppError } from '@flama/backend-core';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { MemberRepositoryPort } from '../../database/member.repository.port';
import type { Member } from '../../domain/membership.types';
import { OrganizationErrors } from '../../domain/organization.errors';
import { OrganizationMapper } from '../../organization.mapper';
import { MEMBER_REPOSITORY } from '../../organizations.di-tokens';
import { GetMembershipQuery } from './get-membership.query';

/** The caller's own membership in an organization, with the account behind it. */
@QueryHandler(GetMembershipQuery)
export class GetMembershipQueryHandler implements IQueryHandler<GetMembershipQuery, Member> {
  constructor(
    @Inject(MEMBER_REPOSITORY)
    private readonly members: MemberRepositoryPort,
  ) {}

  async execute({ organizationId, userId }: GetMembershipQuery): Promise<Member> {
    const found = await this.members.findMembership(organizationId, userId);
    if (found.isNone()) throw new AppError(OrganizationErrors.NOT_A_MEMBER);
    const [withAccount] = OrganizationMapper.withAccounts(
      [found.unwrap()],
      await this.members.findAccounts([userId]),
    );
    return withAccount;
  }
}
