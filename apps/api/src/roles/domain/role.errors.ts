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
  ADMIN_LOCKOUT: {
    code: 'ROLE_004',
    message:
      'A system role that grants full access ("manage all") cannot have that permission removed',
    httpStatus: 403,
  },
  /**
   * No privilege escalation: a role cannot be given reach its author lacks.
   * Without this, anyone who can edit roles can write themselves `manage all`.
   */
  PERMISSION_NOT_GRANTABLE: {
    code: 'ROLE_005',
    message: 'A role cannot be granted permissions its author does not hold',
    httpStatus: 403,
  },
  CROSS_ORGANIZATION_ROLE: {
    code: 'ROLE_006',
    message: 'A role belonging to another organization cannot be modified',
    httpStatus: 403,
  },
  /**
   * A role is created inside the request's organization. A caller with no
   * active organization would otherwise create a *global* role (one every
   * tenant reads) by omission; creating one of those is a deliberate,
   * platform-level act (`CreateRoleCommand.global`), never a default.
   */
  ORGANIZATION_REQUIRED: {
    code: 'ROLE_008',
    message: 'A role is created inside an organization',
    httpStatus: 400,
  },
} as const satisfies Record<string, ErrorDefinition>;
