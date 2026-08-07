import { AppError } from '@flama/backend-core';
import { DomainErrors } from './domain/domain.errors';

/** The slice of the Better Auth session the domains controllers depend on. */
export interface SessionWithOrganization {
  activeOrganizationId?: string | null;
}

export interface RequestWithSession {
  session?: SessionWithOrganization | null;
}

/**
 * Resolve the organization every domain route is scoped to.
 *
 * Domains are organization-owned, so a request without an active organization
 * has no well-defined target. Failing here rather than defaulting keeps a
 * misconfigured session from silently reading or writing the wrong tenant.
 */
export function requireActiveOrganizationId(request: RequestWithSession): string {
  const organizationId = request.session?.activeOrganizationId;
  if (!organizationId) {
    throw new AppError(DomainErrors.ORGANIZATION_REQUIRED, {
      detail:
        'Select an active organization before working with domains. Sessions carry it as activeOrganizationId.',
    });
  }
  return organizationId;
}
