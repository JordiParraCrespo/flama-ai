import { consumerModules } from '@flama/frontend-consumer';
import { FlamaApp } from '@flama/frontend-core/di';
import { ExpoSecureStoreService } from '@flama/frontend-mobile';
import { apiBaseUrl, mobileAuthClient } from './auth-client';
// flama:begin oauth

import { socialProviders } from './social-providers';
// flama:end oauth
// flama:plugins app-imports

export const app = FlamaApp.create({
  apiBaseUrl,
  storage: new ExpoSecureStoreService(),
  authClient: mobileAuthClient,
  // flama:begin oauth
  socialProviders,
  // flama:end oauth
  // flama:plugins app-config
  modules: [
    // Loading the consumer product's modules is what makes this app that product.
    ...consumerModules,
    // flama:plugins app-modules
  ],
});
