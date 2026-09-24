import { consumerModules } from '@flama/frontend-consumer';
import { FlamaApp } from '@flama/frontend-core/di';
import { createMobileAnalyticsClient, ExpoSecureStoreService } from '@flama/frontend-mobile';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiBaseUrl, mobileAuthClient } from './auth-client';

export const app = FlamaApp.create({
  apiBaseUrl,
  storage: new ExpoSecureStoreService(),
  authClient: mobileAuthClient,
  analytics: createMobileAnalyticsClient(),
  // What the API can target a flag on besides the session. The build matters
  // most here: a binary stays installed long after the next one ships, so a
  // feature that needs new native code is gated on `appVersion`.
  featureFlags: {
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    appVersion: Constants.expoConfig?.version,
  },
  // Loading the consumer product's modules is what makes this app that product.
  modules: consumerModules,
});
