import { describe, expect, it } from 'vitest';
import { isFlagEnabled, resolveFlagValue } from '../feature-flags';

describe('resolveFlagValue', () => {
  it('serves what the server said', () => {
    expect(resolveFlagValue('api_token_creation', { api_token_creation: false })).toBe(false);
  });

  // Not loaded, unreachable and "this build does not know that value" are one
  // case: the catalog's safe answer.
  it('falls back to the catalog default when the answer is missing or unusable', () => {
    expect(resolveFlagValue('api_token_creation', undefined)).toBe(true);
    expect(resolveFlagValue('api_token_creation', {})).toBe(true);
    expect(resolveFlagValue('api_token_creation', { api_token_creation: 'yes' })).toBe(true);
  });
});

describe('isFlagEnabled', () => {
  it('treats true as on and false as off', () => {
    expect(isFlagEnabled(true)).toBe(true);
    expect(isFlagEnabled(false)).toBe(false);
  });

  // A multivariate flag reports the variant name rather than `true`. Reading
  // that as "off" would silently park every experiment on its control arm.
  it('treats any variant as on, the empty string included', () => {
    expect(isFlagEnabled('treatment')).toBe(true);
    expect(isFlagEnabled('control')).toBe(true);
    expect(isFlagEnabled('')).toBe(true);
  });

  it('treats an unknown value as off', () => {
    expect(isFlagEnabled(undefined)).toBe(false);
  });
});
