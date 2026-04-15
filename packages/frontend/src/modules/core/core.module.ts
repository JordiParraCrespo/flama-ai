import { ContainerModule } from "inversify";
import { AuthClient } from "@flama/api-client/auth";
import { UsersClient } from "@flama/api-client/users";
import type { IStorageService } from "./storage.service";
import { TOKENS } from "../../di/tokens";

export interface CoreModuleConfig {
  apiBaseUrl: string;
  storage: IStorageService;
}

export function createCoreModule(config: CoreModuleConfig): ContainerModule {
  return new ContainerModule(({ bind }) => {
    bind<IStorageService>(TOKENS.StorageService).toConstantValue(
      config.storage,
    );
    bind(TOKENS.AuthClient).toConstantValue(new AuthClient(config.apiBaseUrl));
    bind(TOKENS.UsersClient).toConstantValue(
      new UsersClient(config.apiBaseUrl),
    );
  });
}
