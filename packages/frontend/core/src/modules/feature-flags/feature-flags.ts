import type {
  ClientFeatureFlagKey,
  FeatureFlagValueOf,
  FlagDefinition,
  FlagValue,
} from '@flama/shared';
import { getFlagDefinition, isValidFlagValue } from '@flama/shared/feature-flags/catalog';

/**
 * A flag's value from a served flag set, or its catalog default.
 *
 * The default covers every case where the server's answer is missing: flags
 * not loaded yet, the API unreachable on a cold start, or a value this build
 * does not recognise (a variant added after it shipped). All three want the
 * same thing — the safe answer the catalog declares — so they collapse to one
 * rule instead of three call-site checks.
 */
export function resolveFlagValue<K extends ClientFeatureFlagKey>(
  key: K,
  flags: Readonly<Record<string, FlagValue>> | undefined,
): FeatureFlagValueOf<K> {
  const definition: FlagDefinition = getFlagDefinition(key);
  const served = flags?.[key];
  return (
    isValidFlagValue(definition, served) ? served : definition.defaultValue
  ) as FeatureFlagValueOf<K>;
}

/**
 * Whether a resolved value counts as "on": `true`, or any variant. A
 * multivariate flag's value is its variant name and every variant is an active
 * state; only `false` is off. An empty-string variant is still a variant — the
 * check is identity, not truthiness.
 */
export function isFlagEnabled(value: FlagValue | undefined): boolean {
  return value !== undefined && value !== false;
}
