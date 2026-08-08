import type { Actions, Subjects } from '@flama/shared';
import { SetMetadata } from '@nestjs/common';

export interface PolicyRule {
  action: Actions;
  subject: Subjects;
}

export const CHECK_POLICIES_KEY = 'check_policies';
export const NO_POLICY_KEY = 'no_policy';
export const PLATFORM_ADMIN_KEY = 'platform_admin';
export const AUTHORIZE_RESOURCE_KEY = 'authorize_resource';

/**
 * Declare the capability a route requires. Checked by `PoliciesGuard` against
 * the caller's effective ability.
 */
export const CheckPolicies = (...rules: PolicyRule[]) => SetMetadata(CHECK_POLICIES_KEY, rules);

/**
 * Declare that a route intentionally requires no capability beyond being
 * authenticated.
 *
 * The reason is mandatory and is not decoration: it is what makes the
 * exemption reviewable, and greppable when someone later asks why a route is
 * open. `PoliciesGuard` rejects any route that declares neither this nor
 * `@CheckPolicies`, so the set of open routes is always an explicit list.
 */
export const NoPolicy = (reason: string) => SetMetadata(NO_POLICY_KEY, reason);

/**
 * Restrict a route to the platform tier (Q0). Short-circuits organization and
 * scope checks, and is always audited.
 */
export const PlatformAdmin = () => SetMetadata(PLATFORM_ADMIN_KEY, true);

export interface AuthorizeResourceOptions {
  /** Registry subject of the resource being acted on. */
  subject: string;
  /** Route parameter carrying the resource id. Defaults to `id`. */
  param?: string;
  /**
   * Action to check against the loaded row. Defaults to the action declared by
   * the route's `@CheckPolicies` rule for the same subject.
   */
  action?: string;
}

/**
 * Authorize a single-row route against the loaded entity, not just its type.
 *
 * `@CheckPolicies` can only answer "may you update leads at all"; this answers
 * "may you update *this* lead". A row that does not exist and a row outside the
 * caller's scope both produce 404, so ids cannot be probed.
 */
export const AuthorizeResource = (options: AuthorizeResourceOptions) =>
  SetMetadata(AUTHORIZE_RESOURCE_KEY, { param: 'id', ...options });
