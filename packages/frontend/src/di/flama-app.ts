import 'reflect-metadata';
import { Container, type ContainerModule } from 'inversify';
import type { ApiTokensService } from '../modules/api-tokens';
import { ApiTokensModule } from '../modules/api-tokens';
import type { AuthService } from '../modules/auth';
import { AuthModule } from '../modules/auth';
import type { IAuthClient } from '../modules/auth/auth.client';
import { createCoreModule } from '../modules/core/core.module';
import type { IStorageService } from '../modules/core/storage.service';
import type { OrganizationsService } from '../modules/organizations';
import { OrganizationsModule } from '../modules/organizations';
import type { UsersService } from '../modules/users';
import { UsersModule } from '../modules/users';
import { TOKENS } from './tokens';

export interface FlamaAppConfig {
  apiBaseUrl: string;
  storage: IStorageService;
  /** Platform-specific Better Auth client adapter. */
  authClient: IAuthClient;
  modules?: ContainerModule[];
}

export class FlamaApp {
  private constructor(public readonly container: Container) {}

  static create(config: FlamaAppConfig): FlamaApp {
    const container = new Container();

    // Core: storage + API client
    container.load(createCoreModule(config));

    // Feature modules
    container.load(AuthModule);
    container.load(UsersModule);
    container.load(ApiTokensModule);
    container.load(OrganizationsModule);

    // Additional modules provided by the app
    if (config.modules) {
      for (const mod of config.modules) {
        container.load(mod);
      }
    }

    return new FlamaApp(container);
  }

  get auth(): AuthService {
    return this.container.get(TOKENS.AuthService);
  }

  get users(): UsersService {
    return this.container.get(TOKENS.UsersService);
  }

  get apiTokens(): ApiTokensService {
    return this.container.get(TOKENS.ApiTokensService);
  }

  get organizations(): OrganizationsService {
    return this.container.get(TOKENS.OrganizationsService);
  }
}
