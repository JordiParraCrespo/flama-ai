import type { PermissionDefinition } from '@flama/shared';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { AbilityScope, AuthenticatedUser } from '../../roles/services/ability.types';
import {
  type AbilityContributor,
  AbilityContributorRegistry,
} from '../../roles/services/ability-contributor';
import type { UserDomainAccessRepositoryPort } from '../database/user-domain-access.repository.port';
import { USER_DOMAIN_ACCESS_REPOSITORY } from '../domain.di-tokens';

/**
 * Narrows the caller's ability to the domains they have been given access to.
 *
 * This is the enforcement half of the design's "All domains" vs "3 domains"
 * member column. Rather than a parallel authorization path, it contributes
 * `cannot` rules to the CASL ability the `PoliciesGuard` already builds, so
 * every existing instance-level `ability.can(...)` check picks the restriction
 * up for free.
 *
 * No rows for a user in an organization means unrestricted **there** — their
 * role applies to every domain in it. That default keeps the common case (and
 * every pre-existing user) working without a backfill, and makes granting
 * access an explicit act.
 */
@Injectable()
export class DomainAccessContributor implements AbilityContributor, OnModuleInit {
  /**
   * Subjects narrowed by domain access, and the field on each that carries the
   * domain id. `Domain` is keyed by its own `id`; resources captured on a
   * domain carry a `domainId`. Later modules (leads, analytics) join this list
   * rather than growing a second enforcement path.
   */
  private static readonly SCOPED_SUBJECTS: ReadonlyArray<{
    subject: string;
    field: string;
  }> = [{ subject: 'Domain', field: 'id' }];

  constructor(
    @Inject(USER_DOMAIN_ACCESS_REPOSITORY)
    private readonly userDomainAccessRepository: UserDomainAccessRepositoryPort,
    private readonly registry: AbilityContributorRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async contribute(user: AuthenticatedUser, _scope: AbilityScope): Promise<PermissionDefinition[]> {
    if (!user.id) return [];

    const restrictions = await this.userDomainAccessRepository.findRestrictionsForUser(user.id);
    if (restrictions.length === 0) return [];

    // One rule per organization the user is restricted in, each qualified by
    // that `organizationId`. A single unqualified rule would deny every domain
    // in the user's *other* organizations, where they are unrestricted.
    return restrictions.flatMap(({ organizationId, domainIds }) =>
      DomainAccessContributor.SCOPED_SUBJECTS.map(({ subject, field }) => ({
        action: 'manage',
        subject,
        // "Cannot touch anything in this organization outside my list."
        // Expressed as $nin rather than a permissive $in so the rule only ever
        // subtracts from what a role granted.
        conditions: { organizationId, [field]: { $nin: domainIds } },
        inverted: true,
        reason: 'You do not have access to this domain',
      })),
    );
  }
}
