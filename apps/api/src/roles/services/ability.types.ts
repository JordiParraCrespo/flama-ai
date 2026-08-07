/**
 * Types shared by `AbilityFactory` and the contributors that extend it. They
 * live apart from both so the factory and the contributor interface can each
 * reference them without importing one another.
 */

/** Minimal shape of the authenticated principal the guard hands to the factory. */
export interface AuthenticatedUser {
  id?: string;
  /** Legacy single-role column, used as a fallback before migration. */
  role?: string;
  [key: string]: unknown;
}

/** Request-scoped context used to interpolate resource-scoping conditions. */
export interface AbilityScope {
  /** The caller's active organization (from `session.activeOrganizationId`). */
  activeOrganizationId?: string | null;
  /** The caller's active workspace/team (from `session.activeTeamId`). */
  activeTeamId?: string | null;
}
