import type { ErrorDefinition } from '@flama/backend-ddd';

/**
 * Role domain error catalog. Surfaced as HTTP responses by the global
 * `AllExceptionsFilter` via `AppError`.
 */
export const RoleErrors = {
  NOT_FOUND: {
    code: 'ROLE_001',
    message: 'Role not found',
    httpStatus: 404,
  },
  NAME_TAKEN: {
    code: 'ROLE_002',
    message: 'A role with this name already exists',
    httpStatus: 409,
  },
  SYSTEM_ROLE_IMMUTABLE: {
    code: 'ROLE_003',
    message: 'System roles cannot be deleted or renamed',
    httpStatus: 403,
  },
} as const satisfies Record<string, ErrorDefinition>;
