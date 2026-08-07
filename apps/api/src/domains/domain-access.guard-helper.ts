import { subject } from '@casl/ability';
import { AppError } from '@flama/backend-core';
import type { AppAbility } from '@flama/shared';
import type { DomainEntity } from './domain/domain.entity';
import { DomainErrors } from './domain/domain.errors';

/**
 * Enforce per-domain access against a loaded record.
 *
 * The `PoliciesGuard` only checks action + subject — it never sees the concrete
 * row — so the restriction `DomainAccessContributor` puts on the ability has to
 * be evaluated here, where the domain is in hand. Keeping it in one helper
 * means every route enforces it the same way.
 */
export function assertCanReachDomain(
  ability: AppAbility | undefined,
  action: string,
  domain: DomainEntity,
): void {
  // No ability means no `@CheckPolicies` ran on the route. Fail closed: a
  // domain route reaching this helper without a guard is a wiring bug, and
  // guessing "allow" would turn it into a silent access-control hole.
  if (!ability?.can(action, subject('Domain', { id: domain.id }))) {
    throw new AppError(DomainErrors.FORBIDDEN_DOMAIN, {
      detail: `Your access does not include the domain ${domain.hostname}`,
      extensions: { domainId: domain.id },
    });
  }
}
