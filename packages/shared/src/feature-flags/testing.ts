import { type BooleanFeatureFlagKey, type ClientFeatureFlagKey, flagCatalog } from './catalog';
import type { FlagDefinition } from './types';

/**
 * A catalog for testing the flag machinery, one flag of each shape it treats
 * differently. The machinery reads whatever `FEATURE_FLAGS` declares — the
 * starter declares nothing — so its tests swap this in instead:
 *
 *   vi.mock('@flama/shared', async (importOriginal) => {
 *     const { withTestFlags } = await import('@flama/shared/feature-flags/testing');
 *     return withTestFlags(await importOriginal());
 *   });
 */
export const TEST_FLAGS = {
  /** An ops kill switch: live by default, read by clients. */
  kill_switch: {
    description: 'Keep the feature under test available.',
    kind: 'ops',
    owner: 'test',
    type: 'boolean',
    defaultValue: true,
    client: true,
    bucketBy: 'user',
  },
  /** An experiment: variants, read by clients, recorded on exposure. */
  checkout_copy: {
    description: 'Try a bolder checkout headline.',
    kind: 'experiment',
    owner: 'test',
    expiresAt: '2099-01-01',
    type: 'variant',
    variants: ['control', 'bold'],
    defaultValue: 'control',
    client: true,
  },
  /** A release flag the server evaluates and never sends. */
  server_rollout: {
    description: 'Serve the new pipeline.',
    kind: 'release',
    owner: 'test',
    expiresAt: '2099-01-01',
    type: 'boolean',
    defaultValue: false,
    client: false,
  },
} as const satisfies Record<string, FlagDefinition>;

/** A module exporting the catalog, with `TEST_FLAGS` in place of its flags. */
export function withTestFlags<M extends object>(module: M): M {
  return { ...module, FEATURE_FLAGS: TEST_FLAGS, ...flagCatalog(TEST_FLAGS) };
}

/*
 * The test keys, typed as the project catalog's so they reach its typed APIs.
 * Going through `string` keeps the cast valid whatever that catalog holds.
 */
export const KILL_SWITCH = 'kill_switch' as string as BooleanFeatureFlagKey & ClientFeatureFlagKey;
export const CHECKOUT_COPY = 'checkout_copy' as string as ClientFeatureFlagKey;
export const SERVER_ROLLOUT = 'server_rollout' as string as BooleanFeatureFlagKey;
