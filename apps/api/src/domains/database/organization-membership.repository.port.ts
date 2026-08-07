/**
 * Read-only view of organization membership, used to confirm that a user a
 * caller is acting *on* actually belongs to the organization the caller is
 * acting *in*.
 *
 * Better Auth owns the `member` table; this port exists so the domains module
 * can ask the one question it needs without depending on the organizations
 * façade (which delegates to `auth.api` and would drag a session into a
 * command handler).
 */
export interface OrganizationMembershipRepositoryPort {
  isMember(userId: string, organizationId: string): Promise<boolean>;
}
