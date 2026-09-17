import { ENDPOINT_POLICIES, type EndpointPolicy } from '@flama/shared/permissions';
import { describe, expect, it } from 'vitest';
import { SCREEN_ROUTES, SCREENS } from './screens';

/** `Object.entries` over a `satisfies` const, widened to the declared shape. */
function entries(): Array<[string, { endpoint: string; policies: readonly EndpointPolicy[] }]> {
  return Object.entries(SCREENS);
}

/**
 * The catalog is data, so what is worth asserting about it is the shape the
 * shell relies on — a row reads `policies` from here, and those policies must
 * be the API's own, not a second copy that can drift from them.
 */
describe('SCREENS', () => {
  it('has an entry for every screen route, and no others', () => {
    expect(Object.keys(SCREENS).sort()).toEqual([...SCREEN_ROUTES].sort());
  });

  it('points every screen at an endpoint the API contract declares', () => {
    for (const [route, screen] of entries()) {
      expect(Object.keys(ENDPOINT_POLICIES), route).toContain(screen.endpoint);
    }
  });

  /**
   * The rules are taken from `ENDPOINT_POLICIES`, never restated here. Reading
   * them off the same object is what keeps a row from claiming less than the
   * endpoint behind it enforces.
   */
  it('takes the rules of the endpoint each screen names', () => {
    for (const [route, screen] of entries()) {
      expect(screen.policies, route).toBe(
        ENDPOINT_POLICIES[screen.endpoint as keyof typeof ENDPOINT_POLICIES],
      );
    }
  });

  it('gates every screen on at least one rule', () => {
    for (const [route, screen] of entries()) {
      expect(screen.policies.length, route).toBeGreaterThan(0);
    }
  });
});
