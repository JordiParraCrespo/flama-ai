/**
 * A user's restriction to specific instances of one resource type, within one
 * organization.
 *
 * Restrictions are **per-organization**: a user may be narrowed to three
 * domains in one organization while keeping unrestricted access in another, so
 * neither the reads nor the writes may treat the table as a single global list.
 */
export interface ResourceRestriction {
  organizationId: string;
  resourceType: string;
  resourceIds: string[];
}

export interface ResourceAccessRepositoryPort {
  /**
   * Ids the user is restricted to for one resource type in one organization.
   * An empty array means no restriction is recorded there.
   */
  findAllowedIds(userId: string, organizationId: string, resourceType: string): Promise<string[]>;

  /**
   * Every restriction the user has, across organizations and resource types.
   * Used to build the CASL rules, which must stay organization-aware — a single
   * unqualified rule would deny the user's other organizations, where they are
   * unrestricted.
   */
  findRestrictionsForUser(userId: string): Promise<ResourceRestriction[]>;

  /**
   * Replace the user's restriction set for one resource type **within one
   * organization**, leaving every other organization and resource type
   * untouched.
   */
  replaceForUser(
    userId: string,
    organizationId: string,
    resourceType: string,
    resourceIds: string[],
  ): Promise<void>;

  /** Drop every restriction row pointing at a resource that no longer exists. */
  deleteForResource(resourceType: string, resourceId: string): Promise<void>;
}
