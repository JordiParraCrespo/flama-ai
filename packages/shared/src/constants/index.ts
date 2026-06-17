export const AUTH = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  SALT_ROUNDS: 12,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

/**
 * Roles seeded by the platform. System roles cannot be renamed or deleted
 * through the API so the application's own authorization keeps working.
 */
export const SYSTEM_ROLES = [ROLES.ADMIN, ROLES.USER] as const;

export const QUEUE_NAMES = {
  EMAIL: 'email',
  FILE_PROCESSING: 'file-processing',
} as const;
