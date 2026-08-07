/**
 * Port for the user↔domain access join. This is a plain link table with no
 * aggregate of its own, so it does not extend `RepositoryPort`.
 */
export interface UserDomainAccessRepositoryPort {
  /**
   * Domain ids the user is restricted to. An empty array means the user has no
   * per-domain restriction recorded and their role applies workspace-wide —
   * callers distinguish this from "access to nothing", which is expressed by
   * having no matching role permission at all.
   */
  findDomainIdsForUser(userId: string): Promise<string[]>;

  /** Replace the user's restriction set in a single transaction. */
  replaceForUser(userId: string, domainIds: string[]): Promise<void>;

  /** Drop every restriction row pointing at a domain (used on removal). */
  deleteForDomain(domainId: string): Promise<void>;
}
