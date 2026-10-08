import type { Option } from 'oxide.ts';
import type { AssignedRole, Member, MemberUser } from '../domain/membership.types';

/**
 * Reads Better Auth's `member` table and what hangs off a member row: the
 * account behind it and the roles assigned to it. Read-only: memberships are
 * written through Better Auth's API, which owns the table.
 */
export interface MemberRepositoryPort {
  /** `userId`'s membership in `organizationId`; `None` when they are not a member there. */
  findMembership(organizationId: string, userId: string): Promise<Option<Member>>;

  findMembershipById(organizationId: string, memberId: string): Promise<Option<Member>>;

  /**
   * The accounts behind these users, as the members list shows them. An id
   * with no account is left out rather than answered with a placeholder.
   */
  findAccounts(userIds: string[]): Promise<MemberUser[]>;

  /**
   * The roles each of these users holds in `organizationId`, by user id.
   *
   * Global assignments (`organizationId IS NULL`) count alongside the
   * organization's own, which is the union `user_role` documents as a user's
   * effective set.
   */
  findAssignedRoles(
    userIds: string[],
    organizationId: string,
  ): Promise<Map<string, AssignedRole[]>>;
}
