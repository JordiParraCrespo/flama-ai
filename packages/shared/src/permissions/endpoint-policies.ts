import type { Actions, Subjects } from './abilities';

/**
 * A CASL rule an endpoint demands — the same `{ action, subject }` shape the
 * API's `@CheckPolicies` decorator takes, and the shape a nav row gates on.
 */
export interface EndpointPolicy {
  action: Actions;
  subject: Subjects;
}

/**
 * What each guarded endpoint demands, keyed by the route Nest mounts it at
 * (less the `/api/v1` prefix).
 *
 * This is one declaration of a rule that would otherwise be written twice:
 * once as `@CheckPolicies` on the controller, once as the policies a client
 * hides a destination behind. Nothing keeps two declarations in step, and when
 * they drift the sidebar hands a plain member links that can only answer 403.
 *
 * `apps/api/src/auth/__tests__/endpoint-policies.spec.ts` asserts that each
 * endpoint below carries exactly the rules named here, and that the handler it
 * checks is really mounted at that path — so the assertion cannot quietly be
 * pointed at the wrong controller and go on passing. The web shell's screen
 * catalog (`@flama/frontend-web`) reads its policies from here rather than
 * restating them, so a row cannot claim less than the endpoint enforces.
 *
 * Only endpoints a client gates a destination on belong here. An endpoint open
 * to every signed-in account carries no entry: an empty rule list would read as
 * "anyone may call this", which is exactly the ambiguity this catalog removes.
 */
export const ENDPOINT_POLICIES = {
  '/organizations/:orgId/members': [{ action: 'read', subject: 'Member' }],
  '/roles': [{ action: 'read', subject: 'Role' }],
  '/tokens': [{ action: 'read', subject: 'ApiToken' }],
  '/admin/users': [{ action: 'manage', subject: 'User' }],
  '/billing/subscriptions': [{ action: 'read', subject: 'Billing' }],
} as const satisfies Record<string, readonly EndpointPolicy[]>;

/** An endpoint whose rules are declared in {@link ENDPOINT_POLICIES}. */
export type GuardedEndpoint = keyof typeof ENDPOINT_POLICIES;

/** Every endpoint in the catalog, for exhaustiveness checks. */
export const GUARDED_ENDPOINTS = Object.keys(ENDPOINT_POLICIES) as GuardedEndpoint[];
