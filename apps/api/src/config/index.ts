import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { emailConfig } from './email.config';
import { redisConfig } from './redis.config';
import { storageConfig } from './storage.config';
// flama:begin oauth

import { oauthConfig } from './oauth.config';
// flama:end oauth
// flama:plugins api-config-imports

/**
 * Every config section the API loads, in load order. A section a feature of
 * its own brings joins this list, and `app.module.ts` loads the list.
 */
export const configs = [
  appConfig,
  databaseConfig,
  redisConfig,
  emailConfig,
  storageConfig,
  // flama:begin oauth
  oauthConfig,
  // flama:end oauth
  // flama:plugins api-config
];
