/**
 * The feature-flags module's bindings. The module is one an app chooses to
 * load, not part of the kernel, so its tokens are its own rather than
 * entries in `TOKENS`.
 */
export const FEATURE_FLAGS_TOKENS = {
  ClientContext: Symbol.for('FeatureFlagsClientContext'),
  Repository: Symbol.for('FeatureFlagsRepository'),
  Service: Symbol.for('FeatureFlagsService'),
} as const;
