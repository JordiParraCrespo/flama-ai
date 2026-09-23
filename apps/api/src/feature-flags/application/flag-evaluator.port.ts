import type {
  ClientFeatureFlags,
  FeatureFlagKey,
  FeatureFlagValueOf,
  FlagEvaluation,
  FlagEvaluationContext,
  FlagSegment,
} from '@flama/shared';

/**
 * Answers "what does this flag say for this caller?" in process, without I/O.
 *
 * The one way the rest of the API asks about a flag. Behind a port so a
 * deployment that outgrows the database-backed snapshot can bind an adapter
 * for a flag vendor (LaunchDarkly, Unleash, an OpenFeature provider) to
 * `FLAG_EVALUATOR` and change nothing else — the result vocabulary is already
 * OpenFeature's.
 */
export interface FlagEvaluatorPort {
  /** One flag, with the reason it resolved as it did. */
  evaluate(key: FeatureFlagKey, context: FlagEvaluationContext): FlagEvaluation;
  /** A flag's value, typed by the catalog. */
  valueOf<K extends FeatureFlagKey>(key: K, context: FlagEvaluationContext): FeatureFlagValueOf<K>;
  /** Whether a flag is on: `true`, or any variant. */
  isEnabled(key: FeatureFlagKey, context: FlagEvaluationContext): boolean;
  /** Every client-visible flag, evaluated — what `GET /v1/feature-flags` serves. */
  evaluateClientFlags(context: FlagEvaluationContext): ClientFeatureFlags;
  /** The segments currently loaded, keyed by segment key. */
  segments(): ReadonlyMap<string, FlagSegment>;
  /** Reload now, rather than at the next poll. Never rejects. */
  refresh(): Promise<void>;
}
