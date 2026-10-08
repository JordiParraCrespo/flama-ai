import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { MemberRepositoryPort } from '../../database/member.repository.port';
import { matchesMemberFilters } from '../../domain/member-search.policy';
import type { Member } from '../../domain/membership.types';
import type { OrganizationAuthPort } from '../../infrastructure/organization-auth.port';
import { OrganizationMapper } from '../../organization.mapper';
import { MEMBER_REPOSITORY, ORGANIZATION_AUTH } from '../../organizations.di-tokens';
import { ListMembersQuery } from './list-members.query';

/**
 * The organization's members, narrowed the way the team table narrows them.
 *
 * Both the search and the role facet are answered here rather than in the
 * browser. The table pages what it is handed, so a facet applied after the
 * response narrows the page on screen and silently drops every match sitting
 * on a page nobody scrolled to — and a filter that is not in the response is
 * a filter no other client (an API token's script, a CSV export) can ask for.
 *
 * The assigned roles are read for both halves: the *name* is what the search
 * matches — the team table's Role column shows an assigned role in preference
 * to the Better Auth organization role — and the *id* is what the role facet
 * picks, because two organizations may name a role the same thing.
 */
@QueryHandler(ListMembersQuery)
export class ListMembersQueryHandler implements IQueryHandler<ListMembersQuery, Member[]> {
  constructor(
    @Inject(ORGANIZATION_AUTH)
    private readonly organizations: OrganizationAuthPort,
    @Inject(MEMBER_REPOSITORY)
    private readonly members: MemberRepositoryPort,
  ) {}

  async execute({ headers, organizationId, filters }: ListMembersQuery): Promise<Member[]> {
    const roster = await this.organizations.listMembers(headers, organizationId);
    const userIds = roster.map((member) => member.userId);
    const members = OrganizationMapper.withAccounts(
      roster,
      await this.members.findAccounts(userIds),
    );

    if (!filters.search && !filters.roleIds?.length) return members;

    const assigned = await this.members.findAssignedRoles(userIds, organizationId);
    return members.filter((member) =>
      matchesMemberFilters(member, assigned.get(member.userId) ?? [], filters),
    );
  }
}
