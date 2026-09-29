import { consumerModules } from '@flama/frontend-consumer';
import { FlamaApp } from '@flama/frontend-core/di';
import { ExpoSecureStoreService } from '@flama/frontend-mobile';
import { apiBaseUrl, mobileAuthClient } from './auth-client';
// flama:begin posthog

import { createPostHogClient } from './posthog';
// flama:end posthog
// flama:plugins app-imports

export const app = FlamaApp.create({
  apiBaseUrl,
  storage: new ExpoSecureStoreService(),
  authClient: mobileAuthClient,
  // flama:begin posthog
  analytics: createPostHogClient(),
  // flama:end posthog
  // flama:plugins app-config
  modules: [
    // Loading the consumer product's modules is what makes this app that product.
    ...consumerModules,
    // flama:plugins app-modules
  ],
});
