import { AppError } from '@flama/backend-core';
import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { MemberRepositoryPort } from '../../database/member.repository.port';
import type { Member } from '../../domain/membership.types';
import { OrganizationErrors } from '../../domain/organization.errors';
import { OrganizationMapper } from '../../organization.mapper';
import { MEMBER_REPOSITORY } from '../../organizations.di-tokens';
import { FindMemberQuery } from './find-member.query';

/** One membership with the account behind it, for a command's controller to answer with. */
@QueryHandler(FindMemberQuery)
export class FindMemberQueryHandler implements IQueryHandler<FindMemberQuery, Member> {
  constructor(
    @Inject(MEMBER_REPOSITORY)
    private readonly members: MemberRepositoryPort,
  ) {}

  async execute({ organizationId, memberId }: FindMemberQuery): Promise<Member> {
    const found = await this.members.findMembershipById(organizationId, memberId);
    if (found.isNone()) throw new AppError(OrganizationErrors.MEMBER_NOT_FOUND);
    const member = found.unwrap();
    const [withAccount] = OrganizationMapper.withAccounts(
      [member],
      await this.members.findAccounts([member.userId]),
    );
    return withAccount;
  }
}
