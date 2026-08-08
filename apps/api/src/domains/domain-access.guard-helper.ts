import { AppError } from '@flama/backend-core';
import type { AppAbility } from '@flama/shared';
import { canReachResource } from '../access-control/resource-access.guard-helper';
import type { DomainEntity } from './domain/domain.entity';
import { DomainErrors } from './domain/domain.errors';

/**
 * Enforce per-domain access against a loaded record.
 *
 * The check itself is generic (`canReachResource`); this wrapper exists so the
 * refusal carries the domains catalog code and a message naming the hostname.
 */
export function assertCanReachDomain(
  ability: AppAbility | undefined,
  action: string,
  domain: DomainEntity,
): void {
  if (!canReachResource(ability, action, 'Domain', domain)) {
    throw new AppError(DomainErrors.FORBIDDEN_DOMAIN, {
      detail: `Your access does not include the domain ${domain.hostname}`,
      extensions: { domainId: domain.id },
    });
  }
}
