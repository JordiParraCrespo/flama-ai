export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const ROLES = {
  /** Platform super administrator: full access + Better Auth admin plugin powers. */
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  USER: 'user',
} as const;

/**
 * Roles seeded by the platform. System roles cannot be renamed or deleted
 * through the API so the application's own authorization keeps working.
 */
export const SYSTEM_ROLES = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.USER] as const;

/**
 * Organization-level roles from the Better Auth organization plugin. Unlike the
 * global {@link ROLES} above (which govern the app's own REST routes via CASL),
 * these gate organization/member/workspace management within a single org.
 */
export const ORGANIZATION_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export const QUEUE_NAMES = {
  EMAIL: 'email',
  FILE_PROCESSING: 'file-processing',
} as const;
