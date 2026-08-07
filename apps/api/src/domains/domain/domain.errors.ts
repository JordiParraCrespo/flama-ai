import type { ErrorDefinition } from '@flama/backend-ddd';

/**
 * Domain (tracked website) error catalog. Surfaced as RFC 7807 problem
 * documents by the global `AllExceptionsFilter` via `AppError`. Messages are
 * the stable problem `title` — anything request-specific goes in `detail`.
 *
 * Every code here is reachable from a request. Codes are not reserved for
 * hypothetical futures: a catalog entry nothing can produce is a promise to
 * clients that the API does not keep.
 */
export const DomainErrors = {
  NOT_FOUND: {
    code: 'DOMAIN_001',
    message: 'Domain not found',
    httpStatus: 404,
  },
  ALREADY_EXISTS: {
    code: 'DOMAIN_002',
    message: 'Domain is already tracked in this organization',
    httpStatus: 409,
  },
  ORGANIZATION_REQUIRED: {
    code: 'DOMAIN_003',
    message: 'No active organization on the session',
    httpStatus: 400,
  },
  FORBIDDEN_DOMAIN: {
    code: 'DOMAIN_004',
    message: 'You do not have access to this domain',
    httpStatus: 403,
  },
  USER_NOT_IN_ORGANIZATION: {
    code: 'DOMAIN_005',
    message: 'User is not a member of this organization',
    httpStatus: 403,
  },
} as const satisfies Record<string, ErrorDefinition>;
