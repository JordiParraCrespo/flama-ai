import { KILL_SWITCH } from '@flama/shared/feature-flags/testing';
import { describe, expect, it, vi } from 'vitest';
import { isFlagEnabled, resolveFlagValue } from '../feature-flags';

// The starter declares no flags; the machinery is tested on a catalog of its own.
vi.mock('@flama/shared/feature-flags/catalog', async (importOriginal) => {
  const { withTestFlags } = await import('@flama/shared/feature-flags/testing');
  return withTestFlags(
    await importOriginal<typeof import('@flama/shared/feature-flags/catalog')>(),
  );
});

describe('resolveFlagValue', () => {
  it('serves what the server said', () => {
    expect(resolveFlagValue(KILL_SWITCH, { kill_switch: false })).toBe(false);
  });

  // Not loaded, unreachable and "this build does not know that value" are one
  // case: the catalog's safe answer.
  it('falls back to the catalog default when the answer is missing or unusable', () => {
    expect(resolveFlagValue(KILL_SWITCH, undefined)).toBe(true);
    expect(resolveFlagValue(KILL_SWITCH, {})).toBe(true);
    expect(resolveFlagValue(KILL_SWITCH, { kill_switch: 'yes' })).toBe(true);
  });
});

describe('isFlagEnabled', () => {
  it('treats true as on and false as off', () => {
    expect(isFlagEnabled(true)).toBe(true);
    expect(isFlagEnabled(false)).toBe(false);
  });

  // A variant flag has no off: reading its control arm as "on" would turn an
  // experiment into a gate everyone passes.
  it('does not treat a variant as on', () => {
    expect(isFlagEnabled('treatment')).toBe(false);
    expect(isFlagEnabled('control')).toBe(false);
  });

  it('treats an unknown value as off', () => {
    expect(isFlagEnabled(undefined)).toBe(false);
  });
});
