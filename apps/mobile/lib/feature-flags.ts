import { createFeatureFlagsModule } from '@flama/frontend-core/feature-flags';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Feature flags as this app asks for them. What the API can target a flag on
 * besides the session: the platform, and the build. The build matters most
 * here: a binary stays installed long after the next one ships, so a feature
 * that needs new native code is gated on `appVersion`.
 */
export const featureFlagsModule = createFeatureFlagsModule({
  platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
  appVersion: Constants.expoConfig?.version,
});
