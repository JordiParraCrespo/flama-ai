import { ApiAuthProblemResponses, ApiProblemResponse } from '@flama/backend-core';
import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

/**
 * The OpenAPI surface every admin route shares: its tag, the bearer scheme,
 * and the problems Better Auth's admin plugin can answer any of them with.
 */
export function ApiAdmin() {
  return applyDecorators(
    ApiTags('Admin'),
    ApiBearerAuth(),
    ApiAuthProblemResponses(),
    ApiProblemResponse({ status: 404, description: 'The user does not exist', code: 'ADMIN_001' }),
    ApiProblemResponse({
      status: 403,
      description:
        'The account may not perform this administrative action, it targets the caller themselves, or the target is banned',
      code: ['ADMIN_003', 'ADMIN_004', 'ADMIN_006'],
    }),
    ApiProblemResponse({
      status: 409,
      description: 'A user with that email already exists',
      code: 'ADMIN_002',
    }),
    ApiProblemResponse({
      status: 400,
      description: 'The role is not assignable, or the request was otherwise rejected',
      code: ['ADMIN_005', 'ADMIN_007'],
    }),
    ApiProblemResponse({
      status: 502,
      description: 'The admin service failed to handle the request',
      code: 'ADMIN_008',
    }),
  );
}
