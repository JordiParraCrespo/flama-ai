import type { HttpMetricsOptions } from '@flama/backend-core';

/**
 * Which `route` label each API route records under. Groups follow the product's
 * areas, not its URLs, so the label set stays under the budget
 * `HttpMetricsModule.register` enforces whatever the route count grows to; a
 * new controller under a known prefix is classified without an edit here, and
 * one under a new prefix fails `http-metrics.config.spec.ts` until it is given
 * a group (a plugin adds its own rules at the `api-metrics-routes` anchor).
 */
export const apiHttpMetricsOptions: HttpMetricsOptions = {
  prefix: '/api',
  // The probes and the scrape itself: recording them would measure the
  // monitoring, and every scrape would change what it scrapes.
  excludedTemplates: ['/v1/health', '/v1/ready', '/v1/metrics'],
  routes: [
    { templatePrefix: '/v1/health/capabilities', group: 'capabilities' },
    { templatePrefix: '/v1/organizations', group: 'organizations' },
    { templatePrefix: '/v1/invitations', group: 'organizations' },
    { templatePrefix: '/v1/workspaces', group: 'organizations' },
    { templatePrefix: '/v1/profile', group: 'account' },
    { templatePrefix: '/v1/users', group: 'account' },
    { templatePrefix: '/v1/roles', group: 'admin' },
    { templatePrefix: '/v1/access-grants', group: 'admin' },
    { templatePrefix: '/v1/authz', group: 'admin' },
    // flama:plugins api-metrics-routes
  ],
};
