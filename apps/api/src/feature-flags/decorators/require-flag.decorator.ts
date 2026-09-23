import { ApiProblemResponse } from '@flama/backend-core';
import type { FeatureFlagKey } from '@flama/shared';
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { FeatureFlagGuard, REQUIRE_FLAG_KEY } from '../guards/feature-flag.guard';

/**
 * Serves a route only while a flag is on for the caller; otherwise it answers
 * `FLAG_003` (403).
 *
 * The server half of a flag the UI also reads. Hiding a button is not a
 * rollout — the endpoint behind it is reachable by anyone with a token — so a
 * flag that gates a capability gates it here too, from the same catalog key:
 *
 * ```ts
 * @Post()
 * @RequireFlag('api_token_creation')
 * create() {}
 * ```
 *
 * Method-level, so it runs after the controller's `ApiAuthGuard` has resolved
 * who is calling and a per-user or per-organization rollout sees them.
 * Evaluation is in memory; the decorator adds no I/O to the route.
 */
export function RequireFlag(key: FeatureFlagKey) {
  return applyDecorators(
    SetMetadata(REQUIRE_FLAG_KEY, key),
    UseGuards(FeatureFlagGuard),
    ApiProblemResponse({
      status: 403,
      description: `The "${key}" feature is switched off for the caller`,
      code: 'FLAG_003',
    }),
  );
}
