/**
 * Everything outside the roster that lets a person act in an organization:
 * the application roles they hold there, access grants naming them, and
 * sessions that still have the organization selected.
 */
export interface OrganizationAccessRepositoryPort {
  /**
   * Take all of it from `userId` in `organizationId`, in one transaction:
   * their roles scoped to it, their grants in it, and — for any session of
   * theirs with it selected — the selection, moved to the organization they
   * joined first among those they are still in (or to none), with the
   * selected workspace cleared.
   */
  revokeFor(userId: string, organizationId: string): Promise<void>;
}
