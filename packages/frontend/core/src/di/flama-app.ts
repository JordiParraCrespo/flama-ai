import 'reflect-metadata';
import type { ClientCapability } from '@flama/shared';
import { Container, type ContainerModule } from 'inversify';
import type { ComponentType } from 'react';
import type { AnalyticsService } from '../modules/analytics';
import { AnalyticsModule } from '../modules/analytics';
import type { IAnalyticsClient } from '../modules/analytics/analytics.client';
import type { AuthService } from '../modules/auth';
import { AuthModule } from '../modules/auth';
import type { IAuthClient, SocialProvider } from '../modules/auth/auth.client';
import type { CapabilitiesService } from '../modules/capabilities';
import { CapabilitiesModule } from '../modules/capabilities';
import { createCoreModule } from '../modules/core/core.module';
import type { IStorageService } from '../modules/core/storage.service';
import type { UserSettingsService } from '../modules/user-settings';
import { UserSettingsModule } from '../modules/user-settings';
import type { UsersService } from '../modules/users';
import { UsersModule } from '../modules/users';
import { TOKENS } from './tokens';

/**
 * A social sign-in provider the app offers: everything a kit needs to draw its
 * button, so the kits name no provider themselves.
 */
export interface SocialSignInProvider {
  /** Better Auth's id for it, which the button starts the round-trip with. */
  id: SocialProvider;
  /** Its name on the button ("Continue with …"). A brand, so never translated. */
  name: string;
  /**
   * The client capability that is on when this deployment has its
   * credentials; the button renders only then.
   */
  capability: ClientCapability;
  /**
   * Its mark, drawn beside the name. It takes no props and draws itself at
   * the size of the kit's button icons (17px).
   */
  mark: ComponentType;
}

export interface FlamaAppConfig {
  apiBaseUrl: string;
  storage: IStorageService;
  /** Platform-specific Better Auth client adapter. */
  authClient: IAuthClient;
  /**
   * Platform-specific analytics adapter. Omit it and the app runs against a
   * no-op client — events are dropped.
   */
  analytics?: IAnalyticsClient;
  /**
   * The social sign-in providers the app offers, in the order their buttons
   * appear. Omit it and the sign-in screens have no social section.
   */
  socialProviders?: readonly SocialSignInProvider[];
  /**
   * The product's modules: `consumerModules` from `@flama/frontend-consumer`
   * or `adminModules` from `@flama/frontend-admin`. The kernel binds what
   * every product shares (session, users, capabilities, analytics); the app
   * decides which product it is by what it loads here, and adds any optional
   * module beside it.
   */
  modules?: ContainerModule[];
}

export class FlamaApp {
  private constructor(
    public readonly container: Container,
    /** What `socialProviders` listed, for the kits' sign-in screens. */
    public readonly socialProviders: readonly SocialSignInProvider[],
  ) {}

  static create(config: FlamaAppConfig): FlamaApp {
    const container = new Container();

    // Core: storage + analytics client + API client
    container.load(createCoreModule(config));

    // Kernel modules, shared by every product
    container.load(AnalyticsModule);
    container.load(AuthModule);
    container.load(CapabilitiesModule);
    container.load(UsersModule);
    container.load(UserSettingsModule);

    // The product's modules, and anything else the app adds
    if (config.modules) {
      for (const mod of config.modules) {
        container.load(mod);
      }
    }

    return new FlamaApp(container, config.socialProviders ?? []);
  }

  get auth(): AuthService {
    return this.container.get(TOKENS.AuthService);
  }

  get users(): UsersService {
    return this.container.get(TOKENS.UsersService);
  }

  get userSettings(): UserSettingsService {
    return this.container.get(TOKENS.UserSettingsService);
  }

  get analytics(): AnalyticsService {
    return this.container.get(TOKENS.AnalyticsService);
  }

  get capabilities(): CapabilitiesService {
    return this.container.get(TOKENS.CapabilitiesService);
  }
}
