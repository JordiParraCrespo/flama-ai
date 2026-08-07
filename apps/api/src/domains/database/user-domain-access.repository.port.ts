/**
 * A user's domain restriction within one organization. Restrictions are
 * **per-organization**: a user may be narrowed to three domains in one
 * organization while keeping workspace-wide access in another, so neither the
 * reads nor the writes here may treat the join as a single global list.
 */
export interface UserDomainRestriction {
  organizationId: string;
  domainIds: string[];
}

/**
 * Port for the user↔domain access join. This is a plain link table with no
 * aggregate of its own, so it does not extend `RepositoryPort`.
 */
export interface UserDomainAccessRepositoryPort {
  /**
   * Domain ids the user is restricted to **within `organizationId`**. An empty
   * array means no restriction is recorded there, so their role applies to
   * every domain in that organization — callers distinguish this from "access
   * to nothing", which is expressed by having no matching role permission.
   */
  findDomainIdsForUser(userId: string, organizationId: string): Promise<string[]>;

  /**
   * Every organization in which the user has a restriction, with its domain
   * ids. Used to build the CASL rules, which must stay organization-aware —
   * a single global rule would deny the user's other organizations, where they
   * are unrestricted.
   */
  findRestrictionsForUser(userId: string): Promise<UserDomainRestriction[]>;

  /**
   * Replace the user's restriction set **within one organization**, leaving
   * their restrictions in every other organization untouched.
   */
  replaceForUser(userId: string, organizationId: string, domainIds: string[]): Promise<void>;

  /** Drop every restriction row pointing at a domain (used on removal). */
  deleteForDomain(domainId: string): Promise<void>;
}
