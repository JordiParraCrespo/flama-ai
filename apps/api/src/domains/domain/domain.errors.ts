import type { ErrorDefinition } from '@flama/backend-ddd';

/**
 * Domain (tracked website) error catalog. Surfaced as RFC 7807 problem
 * documents by the global `AllExceptionsFilter` via `AppError`. Messages are
 * the stable problem `title` — anything request-specific goes in `detail`.
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
  INVALID_HOSTNAME: {
    code: 'DOMAIN_003',
    message: 'Hostname is not a valid bare domain name',
    httpStatus: 400,
  },
  NOT_VERIFIED: {
    code: 'DOMAIN_004',
    message: 'Domain must be verified before it can be activated',
    httpStatus: 409,
  },
  ORGANIZATION_REQUIRED: {
    code: 'DOMAIN_005',
    message: 'No active organization on the session',
    httpStatus: 400,
  },
  FORBIDDEN_DOMAIN: {
    code: 'DOMAIN_006',
    message: 'You do not have access to this domain',
    httpStatus: 403,
  },
} as const satisfies Record<string, ErrorDefinition>;
