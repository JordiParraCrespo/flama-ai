import { OpenAPI } from '@flama/api-client';
import { ContainerModule } from 'inversify';
import { TOKENS } from '../../di/tokens';
import type { IAuthClient } from '../auth/auth.client';
import type { IStorageService } from './storage.service';

export interface CoreModuleConfig {
  apiBaseUrl: string;
  storage: IStorageService;
  authClient: IAuthClient;
}

export function createCoreModule(config: CoreModuleConfig): ContainerModule {
  return new ContainerModule(({ bind }) => {
    // Authentication is cookie-based. On web the browser sends the session
    // cookie automatically (credentials: include). On native, the Better Auth
    // Expo client stores the cookie in SecureStore and exposes it via
    // `getAuthHeaders()`, which we attach to every generated API request.
    OpenAPI.BASE = config.apiBaseUrl;
    OpenAPI.WITH_CREDENTIALS = true;
    OpenAPI.CREDENTIALS = 'include';
    OpenAPI.HEADERS = () => config.authClient.getAuthHeaders();

    bind<IStorageService>(TOKENS.StorageService).toConstantValue(config.storage);
    bind<IAuthClient>(TOKENS.AuthClient).toConstantValue(config.authClient);
  });
}
