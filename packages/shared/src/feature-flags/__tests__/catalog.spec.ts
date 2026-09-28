import { describe, expect, it } from 'vitest';
import { expiredFlags, FEATURE_FLAGS, flagCatalog, isValidFlagValue } from '../catalog';
import { updateFeatureFlagSchema } from '../schema';
import { TEST_FLAGS } from '../testing';
import type { FlagDefinition } from '../types';

describe('the feature-flag catalog', () => {
  // The project's flags, whichever it declares, and the ones the tests use.
  const declared: Record<string, FlagDefinition> = { ...FEATURE_FLAGS, ...TEST_FLAGS };

  it.each(Object.keys(declared))('%s is well-formed', (key) => {
    const definition = declared[key];

    expect(key).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(definition.description.trim()).not.toBe('');
    expect(definition.owner.trim()).not.toBe('');
    expect(isValidFlagValue(definition, definition.defaultValue)).toBe(true);
    // Temporary kinds are debt with a due date.
    if (definition.kind !== 'ops') expect(definition.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    if (definition.type === 'variant') {
      expect(new Set(definition.variants).size).toBe(definition.variants.length);
    }
  });
});

describe('flagCatalog', () => {
  const catalog = flagCatalog(TEST_FLAGS);

  it('lists only client flags as client keys, with their defaults', () => {
    expect(catalog.CLIENT_FEATURE_FLAG_KEYS).toEqual(['kill_switch', 'checkout_copy']);
    expect(catalog.defaultClientFlagValues()).toEqual({
      kill_switch: true,
      checkout_copy: 'control',
    });
  });

  it('recognises its own keys and nothing inherited', () => {
    expect(catalog.isFeatureFlagKey('server_rollout')).toBe(true);
    expect(catalog.isFeatureFlagKey('toString')).toBe(false);
  });
});

describe('expiredFlags', () => {
  const catalog: Record<string, FlagDefinition> = {
    shipped: {
      description: 'x',
      kind: 'release',
      owner: 'x',
      expiresAt: '2026-01-01',
      client: false,
      type: 'boolean',
      defaultValue: false,
    },
    running: {
      description: 'x',
      kind: 'experiment',
      owner: 'x',
      expiresAt: '2027-01-01',
      client: false,
      type: 'boolean',
      defaultValue: false,
    },
    switch: {
      description: 'x',
      kind: 'ops',
      owner: 'x',
      expiresAt: '2020-01-01',
      client: false,
      type: 'boolean',
      defaultValue: true,
    },
  };

  it('names temporary flags past their date, never an ops switch', () => {
    expect(expiredFlags('2026-06-01', catalog)).toEqual(['shipped']);
    expect(expiredFlags('2026-01-01', catalog)).toEqual(['shipped']);
    expect(expiredFlags('2025-12-31', catalog)).toEqual([]);
  });
});

describe('updateFeatureFlagSchema', () => {
  const base = { enabled: true, rules: [], fallthrough: { value: true } };

  it('accepts a split whose weights add up to 100', () => {
    const result = updateFeatureFlagSchema.safeParse({
      ...base,
      fallthrough: {
        split: [
          { value: true, weight: 12.5 },
          { value: false, weight: 87.5 },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a split that does not', () => {
    const result = updateFeatureFlagSchema.safeParse({
      ...base,
      fallthrough: {
        split: [
          { value: true, weight: 10 },
          { value: false, weight: 80 },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects weights that leave a bucket uncovered', () => {
    const result = updateFeatureFlagSchema.safeParse({
      ...base,
      fallthrough: {
        split: [
          { value: true, weight: 33.333 },
          { value: false, weight: 33.333 },
          { value: false, weight: 33.334 },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it('accepts a three-way split in 0.01 % steps', () => {
    const result = updateFeatureFlagSchema.safeParse({
      ...base,
      fallthrough: {
        split: [
          { value: true, weight: 33.33 },
          { value: false, weight: 33.33 },
          { value: false, weight: 33.34 },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects duplicate rule ids', () => {
    const rule = { id: 'r1', conditions: [], serve: { value: true } };
    expect(updateFeatureFlagSchema.safeParse({ ...base, rules: [rule, rule] }).success).toBe(false);
  });
});
