import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { emailConfig } from './email.config';
import { oauthConfig } from './oauth.config';
import { redisConfig } from './redis.config';
import { storageConfig } from './storage.config';
// flama:begin email

import { resendConfig } from './resend.config';
import { smtpConfig } from './smtp.config';
// flama:end email
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
  oauthConfig,
  // flama:begin email
  smtpConfig,
  resendConfig,
  // flama:end email
  // flama:plugins api-config
];
