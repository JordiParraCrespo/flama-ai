import type { AssignedRole, Member } from './membership.types';

/** How the members list is narrowed; both parts optional, and both apply. */
export interface MemberFilters {
  /** Matched against name, email, organization role and assigned role names. */
  search?: string;
  /** Keep members holding any of these assigned roles. */
  roleIds?: string[];
}

/**
 * Whether a member belongs in the list the reader asked for.
 *
 * The role facet is any, not all: a member holding `admin` and `user` belongs
 * under both facets, which is the union `user_role` documents as their
 * effective set. The search matches name, email, organization role and the
 * names of any roles assigned to them — every field the team table puts on the
 * row, so that searching for something visible cannot come back empty. The
 * needle is lowercased once and compared with `includes`.
 */
export function matchesMemberFilters(
  member: Member,
  assignedRoles: AssignedRole[],
  { search, roleIds }: MemberFilters,
): boolean {
  if (roleIds?.length && !assignedRoles.some((role) => roleIds.includes(role.id))) return false;

  const needle = search?.trim().toLocaleLowerCase();
  if (!needle) return true;

  return [
    member.user?.name,
    member.user?.email,
    member.role,
    ...assignedRoles.map((role) => role.name),
  ].some((field) => field?.toLocaleLowerCase().includes(needle));
}
