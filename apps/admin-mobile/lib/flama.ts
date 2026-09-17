import { adminModules } from '@flama/frontend-admin';
import { FlamaApp } from '@flama/frontend-core/di';
import { createMobileAnalyticsClient, ExpoSecureStoreService } from '@flama/frontend-mobile';
import { mobileAuthClient } from './auth-client';

export const app = FlamaApp.create({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001',
  storage: new ExpoSecureStoreService(),
  authClient: mobileAuthClient,
  analytics: createMobileAnalyticsClient(),
  // Loading the admin product's modules is what makes this app that product.
  modules: adminModules,
});
