/** The account behind a membership, as the members list shows it. */
export interface MemberUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
}

/**
 * One person's membership in one organization: Better Auth's `member` row,
 * whose `role` is the organization role (`owner`, `admin`, `member`), and the
 * account it belongs to when that has been read. A read model: Better Auth
 * owns and writes the row, so there is no aggregate behind it.
 */
export interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Date;
  user: MemberUser | null;
}

/** One role a user holds: the name the search matches, the id the facet picks. */
export interface AssignedRole {
  id: string;
  name: string;
}
