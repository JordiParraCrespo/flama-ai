import { consumerModules } from '@flama/frontend-consumer';
import { FlamaApp } from '@flama/frontend-core/di';
import { createMobileAnalyticsClient, ExpoSecureStoreService } from '@flama/frontend-mobile';
import { apiBaseUrl, mobileAuthClient } from './auth-client';
// flama:begin feature-flags
import { featureFlagsModule } from './feature-flags';
// flama:end feature-flags
// flama:plugins app-imports

export const app = FlamaApp.create({
  apiBaseUrl,
  storage: new ExpoSecureStoreService(),
  authClient: mobileAuthClient,
  analytics: createMobileAnalyticsClient(),
  modules: [
    // Loading the consumer product's modules is what makes this app that product.
    ...consumerModules,
    // flama:begin feature-flags
    featureFlagsModule,
    // flama:end feature-flags
    // flama:plugins app-modules
  ],
});
