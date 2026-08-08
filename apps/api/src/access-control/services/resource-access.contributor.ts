import type { PermissionDefinition } from '@flama/shared';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { AbilityScope, AuthenticatedUser } from '../../roles/services/ability.types';
import {
  type AbilityContributor,
  AbilityContributorRegistry,
} from '../../roles/services/ability-contributor';
import { RESOURCE_ACCESS_REPOSITORY } from '../access-control.di-tokens';
import type { ResourceAccessRepositoryPort } from '../database/resource-access.repository.port';
import { RestrictableResourceRegistry } from './restrictable-resource.registry';

/**
 * Narrows the caller's ability to the resource instances they have been given
 * access to — for every registered resource type, not just one.
 *
 * Rather than a parallel authorization path, it contributes `cannot` rules to
 * the CASL ability the `PoliciesGuard` already builds, so every instance-level
 * `ability.can(...)` check picks the restriction up for free.
 *
 * There is one contributor for the whole application. A module that wants
 * per-instance access registers a {@link RestrictableResource}; it does not
 * write a contributor of its own.
 */
@Injectable()
export class ResourceAccessContributor implements AbilityContributor, OnModuleInit {
  constructor(
    @Inject(RESOURCE_ACCESS_REPOSITORY)
    private readonly resourceAccessRepository: ResourceAccessRepositoryPort,
    private readonly resources: RestrictableResourceRegistry,
    private readonly abilityContributors: AbilityContributorRegistry,
  ) {}

  onModuleInit(): void {
    this.abilityContributors.register(this);
  }

  async contribute(user: AuthenticatedUser, _scope: AbilityScope): Promise<PermissionDefinition[]> {
    if (!user.id) return [];

    const restrictions = await this.resourceAccessRepository.findRestrictionsForUser(user.id);
    if (restrictions.length === 0) return [];

    return restrictions.flatMap(({ organizationId, resourceType, resourceIds }) => {
      const resource = this.resources.resolve(resourceType);
      if (!resource) return [];

      // One rule per (organization, subject), qualified by `organizationId`. A
      // single unqualified rule would deny every instance in the user's *other*
      // organizations, where they are unrestricted.
      return resource.scopedSubjects.map(({ subject, field }) => ({
        action: 'manage',
        subject,
        // "Cannot touch anything of this type in this organization outside my
        // list." Expressed as $nin rather than a permissive $in so the rule only
        // ever subtracts from what a role granted.
        conditions: { organizationId, [field]: { $nin: resourceIds } },
        inverted: true,
        reason: `You do not have access to this ${resourceType}`,
      }));
    });
  }
}
