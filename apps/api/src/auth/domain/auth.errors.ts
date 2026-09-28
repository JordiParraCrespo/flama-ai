import type { ErrorDefinition } from '@flama/backend-ddd';

/**
 * Authentication and authorization error catalog for the guards that protect
 * every route. Surfaced as HTTP responses by the global `AllExceptionsFilter`
 * via `AppError`.
 *
 * These are deliberately coarse. A guard knows only that the caller is
 * unauthenticated or that a rule said no — spelling out *which* rule, or
 * whether a session was absent versus expired, hands a caller a probing
 * oracle for the permission model. The specifics go to the server log.
 *
 * Scoped-credential failures have their own codes in `CredentialErrors`.
 */
export const AuthErrors = {
  UNAUTHENTICATED: {
    code: 'AUTH_001',
    message: 'Authentication required',
    httpStatus: 401,
  },
  FORBIDDEN: {
    code: 'AUTH_002',
    message: 'You do not have permission to perform this action',
    httpStatus: 403,
  },
} as const satisfies Record<string, ErrorDefinition>;

/**
 * What a scoped credential — an API token, an OAuth grant — can fail on.
 *
 * Authentication failures deliberately share one opaque code (`TOKEN_003`):
 * telling a caller whether a credential is unknown, revoked or expired hands an
 * attacker a probing oracle. Authorization failures are specific — the caller
 * holds a valid credential and needs to know what it is short of.
 */
export const CredentialErrors = {
  INVALID_CREDENTIAL: {
    code: 'TOKEN_003',
    message: 'Invalid or expired API token',
    httpStatus: 401,
  },
  INSUFFICIENT_SCOPE: {
    code: 'TOKEN_005',
    message: 'This credential is missing a permission required by this endpoint',
    httpStatus: 403,
  },
  ENDPOINT_NOT_TOKEN_ACCESSIBLE: {
    code: 'TOKEN_006',
    message: 'This endpoint cannot be called with a scoped credential',
    httpStatus: 403,
  },
  ORGANIZATION_OUT_OF_SCOPE: {
    code: 'TOKEN_007',
    message: 'This credential is not scoped to that organization',
    httpStatus: 403,
  },
} as const satisfies Record<string, ErrorDefinition>;
