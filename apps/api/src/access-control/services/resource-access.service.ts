import { Inject, Injectable } from '@nestjs/common';
import { RESOURCE_ACCESS_REPOSITORY } from '../access-control.di-tokens';
import type { ResourceAccessRepositoryPort } from '../database/resource-access.repository.port';

/**
 * Reads and writes per-instance resource access.
 *
 * Its job beyond the repository is to hold the **"no rows means unrestricted"**
 * rule in one place. That distinction is easy to get wrong at a call site: an
 * empty array reads naturally as "allowed nothing", which is the opposite of
 * what an absent restriction means, and getting it backwards either locks
 * everyone out or silently grants everything.
 */
@Injectable()
export class ResourceAccessService {
  constructor(
    @Inject(RESOURCE_ACCESS_REPOSITORY)
    private readonly repository: ResourceAccessRepositoryPort,
  ) {}

  /**
   * Ids to filter a listing by, or `undefined` when the user is unrestricted
   * for this resource type in this organization.
   *
   * Pass the result straight to a repository's `allowedIds` filter: `undefined`
   * means "no `WHERE ... IN`", an array means restrict to exactly these.
   */
  async allowedIds(
    userId: string,
    organizationId: string,
    resourceType: string,
  ): Promise<string[] | undefined> {
    const ids = await this.repository.findAllowedIds(userId, organizationId, resourceType);
    return ids.length === 0 ? undefined : ids;
  }

  /** The raw restriction, where the caller needs to report it rather than filter by it. */
  async restrictedTo(
    userId: string,
    organizationId: string,
    resourceType: string,
  ): Promise<{ resourceIds: string[]; unrestricted: boolean }> {
    const resourceIds = await this.repository.findAllowedIds(userId, organizationId, resourceType);
    return { resourceIds, unrestricted: resourceIds.length === 0 };
  }

  /** Replace the restriction; an empty list clears it back to unrestricted. */
  replace(
    userId: string,
    organizationId: string,
    resourceType: string,
    resourceIds: string[],
  ): Promise<void> {
    return this.repository.replaceForUser(userId, organizationId, resourceType, resourceIds);
  }

  /** Drop every grant pointing at a resource that has been deleted. */
  revokeResource(resourceType: string, resourceId: string): Promise<void> {
    return this.repository.deleteForResource(resourceType, resourceId);
  }
}
