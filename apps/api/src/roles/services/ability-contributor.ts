import type { PermissionDefinition } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import type { AbilityScope, AuthenticatedUser } from './ability.types';

/**
 * Extension point letting a feature module add rules to the caller's ability
 * without `roles/` having to import that module — which would be a cycle, since
 * every feature module already depends on the global roles module.
 *
 * **Contributors may only narrow.** They run after the role-derived rules and
 * must return `inverted` (CASL `cannot`) rules; returning a permissive rule
 * would let a feature module hand out access no role granted. `AbilityFactory`
 * drops any non-inverted rule a contributor returns rather than trusting it.
 *
 * The `domains` module uses this to enforce per-member domain access from the
 * `user_domain_access` join.
 */
export interface AbilityContributor {
  contribute(user: AuthenticatedUser, scope: AbilityScope): Promise<PermissionDefinition[]>;
}

/**
 * Holds the registered {@link AbilityContributor}s.
 *
 * Nest has no multi-provider token, so contributors register themselves here
 * from their own module's `onModuleInit`. Provided by the `@Global` roles
 * module, which is what keeps the dependency pointing feature-module → roles
 * and never back.
 */
@Injectable()
export class AbilityContributorRegistry {
  private readonly contributors: AbilityContributor[] = [];

  register(contributor: AbilityContributor): void {
    if (!this.contributors.includes(contributor)) {
      this.contributors.push(contributor);
    }
  }

  all(): readonly AbilityContributor[] {
    return this.contributors;
  }
}
