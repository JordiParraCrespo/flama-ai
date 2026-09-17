import { describe, expect, it } from 'vitest';
import { ENDPOINT_POLICIES, type EndpointPolicy, GUARDED_ENDPOINTS } from '../endpoint-policies';

/** `Object.entries` over a `satisfies` const, widened to the declared shape. */
function entries(): Array<[string, readonly EndpointPolicy[]]> {
  return Object.entries(ENDPOINT_POLICIES);
}

/**
 * The catalog is data, so what is worth asserting about it is the shape its
 * consumers rely on — the API's `endpoint-policies.spec.ts` walks these keys to
 * find the handler it checks, and the web shell reads `policies` from here.
 */
describe('ENDPOINT_POLICIES', () => {
  it('lists every endpoint it declares', () => {
    expect(GUARDED_ENDPOINTS.sort()).toEqual(Object.keys(ENDPOINT_POLICIES).sort());
  });

  it('keys every entry by an absolute path', () => {
    for (const endpoint of GUARDED_ENDPOINTS) {
      expect(endpoint).toMatch(/^\//);
    }
  });

  /**
   * A guarded endpoint with no rules is the bug this catalog was created for:
   * an empty list reads as "anyone may call this", which is what `/dashboard`
   * and `/emails` claimed while their handlers refused a plain member. An
   * endpoint genuinely open to every account does not belong here at all.
   */
  it('gates every endpoint on at least one rule', () => {
    for (const [endpoint, policies] of entries()) {
      expect(policies.length, endpoint).toBeGreaterThan(0);
    }
  });

  it('states each rule as a non-empty action and subject', () => {
    for (const [endpoint, policies] of entries()) {
      for (const policy of policies) {
        expect(policy.action, endpoint).not.toBe('');
        expect(policy.subject, endpoint).not.toBe('');
      }
    }
  });
});
