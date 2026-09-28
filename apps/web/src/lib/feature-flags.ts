import { createFeatureFlagsModule } from '@flama/frontend-core/feature-flags';

/**
 * Feature flags as this app asks for them. What the API can target a flag on
 * besides the session: this is the web client, at this build.
 */
export const featureFlagsModule = createFeatureFlagsModule({
  platform: 'web',
  appVersion: __APP_VERSION__,
});
