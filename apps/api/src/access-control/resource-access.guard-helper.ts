import type { AppAbility } from '@flama/shared';
import { subject } from '@flama/shared';

/** The fields a per-instance check needs from the loaded record. */
export interface ScopedResource {
  id: string;
  organizationId: string;
}

/**
 * May the caller act on this specific record?
 *
 * The `PoliciesGuard` only checks action + subject — it never sees the concrete
 * row — so the restriction `ResourceAccessContributor` puts on the ability has
 * to be evaluated here, where the record is in hand.
 *
 * `organizationId` is part of the tagged subject on purpose: the contributor's
 * rules are qualified per organization, so omitting it would stop them matching
 * and silently grant access.
 *
 * Returns a boolean rather than throwing so each module raises its own error
 * with its own catalog code and wording; this stays transport-agnostic.
 */
export function canReachResource(
  ability: AppAbility | undefined,
  action: string,
  subjectName: string,
  resource: ScopedResource,
): boolean {
  // No ability means no `@CheckPolicies` ran on the route. Fail closed: a route
  // reaching this helper without a guard is a wiring bug, and guessing "allow"
  // would turn it into a silent access-control hole.
  return (
    ability?.can(
      action,
      subject(subjectName, {
        id: resource.id,
        organizationId: resource.organizationId,
      }),
    ) ?? false
  );
}
