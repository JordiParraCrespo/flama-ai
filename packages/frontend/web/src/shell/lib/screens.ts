import { ENDPOINT_POLICIES, type EndpointPolicy } from '@flama/shared/permissions';

/**
 * The workspace destinations the shell gates on permissions.
 *
 * Screens open to every signed-in account — the dashboard, the profile,
 * settings — carry no entry: an empty policy list would read as "show this to
 * everyone", which is exactly the ambiguity this catalog exists to remove.
 */
export const SCREEN_ROUTES = ['/team', '/roles', '/api-tokens', '/admin', '/billing'] as const;

export type ScreenRoute = (typeof SCREEN_ROUTES)[number];

/** What a screen needs before it is worth offering, and where that comes from. */
export interface ScreenEntry {
  /** The endpoint the screen's data comes from, less the API's `/api/v1` prefix. */
  endpoint: string;
  /** The rules that endpoint demands — taken from the API contract, never restated. */
  policies: readonly EndpointPolicy[];
}

/**
 * Which endpoint each gated screen shows, and therefore what it demands.
 *
 * A row names its endpoint and takes that endpoint's rules from
 * `ENDPOINT_POLICIES` in `@flama/shared/permissions` — the same declaration
 * the API's `@CheckPolicies` is asserted against. Writing the rules out here
 * instead would put a second copy of them in the build, and two copies drift:
 * a screen offered to a plain member whose endpoint refuses them is a link
 * that can only answer 403.
 *
 * The route paths live here rather than in `@flama/shared` because they are
 * this platform's URLs, not part of the API contract — `apps/mobile` reaches
 * the same endpoints under entirely different route names.
 */
export const SCREENS = {
  '/team': {
    endpoint: '/organizations/:orgId/members',
    policies: ENDPOINT_POLICIES['/organizations/:orgId/members'],
  },
  '/roles': {
    endpoint: '/roles',
    policies: ENDPOINT_POLICIES['/roles'],
  },
  '/api-tokens': {
    endpoint: '/tokens',
    policies: ENDPOINT_POLICIES['/tokens'],
  },
  '/admin': {
    endpoint: '/admin/users',
    policies: ENDPOINT_POLICIES['/admin/users'],
  },
  '/billing': {
    endpoint: '/billing/subscriptions',
    policies: ENDPOINT_POLICIES['/billing/subscriptions'],
  },
} as const satisfies Record<ScreenRoute, ScreenEntry>;
