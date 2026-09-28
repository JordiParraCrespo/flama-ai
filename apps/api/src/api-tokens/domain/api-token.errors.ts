import type { ErrorDefinition } from '@flama/backend-ddd';

/**
 * API token domain error catalog. Surfaced as HTTP responses by the global
 * `AllExceptionsFilter` via `AppError`.
 *
 * The failures any scoped credential shares — an unknown or expired one, a
 * missing scope — are `CredentialErrors`, in `auth`, and keep the `TOKEN_`
 * codes they were first given.
 */
export const ApiTokenErrors = {
  NOT_FOUND: {
    code: 'TOKEN_001',
    message: 'API token not found',
    httpStatus: 404,
  },
  SCOPES_EXCEED_GRANTER: {
    code: 'TOKEN_002',
    message: 'A token cannot be granted permissions its creator does not hold',
    httpStatus: 403,
  },
  IP_NOT_ALLOWED: {
    code: 'TOKEN_004',
    message: 'This API token may not be used from this IP address',
    httpStatus: 403,
  },
  NOT_A_MEMBER: {
    code: 'TOKEN_008',
    message: 'A token can only be scoped to organizations its creator belongs to',
    httpStatus: 403,
  },
  LIMIT_REACHED: {
    code: 'TOKEN_009',
    message: 'The maximum number of active API tokens has been reached',
    httpStatus: 409,
  },
} as const satisfies Record<string, ErrorDefinition>;
