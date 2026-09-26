import type { FlamaApp } from '@flama/frontend-core';
import type { ApiTokensService } from '../modules/api-tokens';
import { ApiTokensModule } from '../modules/api-tokens';
// flama:begin organizations
import type { OrganizationsService } from '../modules/organizations';
import { OrganizationsModule } from '../modules/organizations';
// flama:end organizations
import type { ProfileService } from '../modules/profile';
import { ProfileModule } from '../modules/profile';
import { TOKENS } from './tokens';

/**
 * What a consumer app loads into `FlamaApp.create({ modules })`. Loading these
 * is what makes an app the consumer product; the admin product loads
 * `adminModules` instead, and no app loads both.
 */
export const consumerModules = [
  ApiTokensModule,
  // flama:begin organizations
  OrganizationsModule,
  // flama:end organizations
  ProfileModule,
];

/**
 * The consumer product's services, resolved from the kernel container.
 *
 * `FlamaApp` only knows the kernel; the product's services are reached
 * through the container, and this wrapper is the one place that does so, so
 * the query hooks read `app.organizations` like they read `app.auth`.
 */
export class ConsumerApp {
  private static readonly instances = new WeakMap<FlamaApp, ConsumerApp>();

  private constructor(public readonly kernel: FlamaApp) {}

  static for(app: FlamaApp): ConsumerApp {
    let instance = ConsumerApp.instances.get(app);
    if (!instance) {
      instance = new ConsumerApp(app);
      ConsumerApp.instances.set(app, instance);
    }
    return instance;
  }

  get auth() {
    return this.kernel.auth;
  }

  get users() {
    return this.kernel.users;
  }

  get apiTokens(): ApiTokensService {
    return this.kernel.container.get(TOKENS.ApiTokensService);
  }

  // flama:begin organizations
  get organizations(): OrganizationsService {
    return this.kernel.container.get(TOKENS.OrganizationsService);
  }
  // flama:end organizations
  get profile(): ProfileService {
    return this.kernel.container.get(TOKENS.ProfileService);
  }
}
