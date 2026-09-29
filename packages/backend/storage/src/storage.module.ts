import { type DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

/** A storage driver: a `StorageService` built from the app's configuration. */
export type StorageDriver = new (configService: ConfigService) => StorageService;

/** The drivers an app can run on, keyed by the name `storage.provider` holds. */
export type StorageDrivers = Record<string, StorageDriver>;

@Global()
@Module({})
export class StorageModule {
  /**
   * Binds `StorageService` to the driver `storage.provider` names, out of the
   * ones the app passes. The app's config schema accepts exactly those names;
   * the lookup still refuses any other, so a name no driver answers to never
   * falls through to some other driver.
   */
  static register(drivers: StorageDrivers): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        {
          provide: StorageService,
          useFactory: (configService: ConfigService) => {
            const name = configService.getOrThrow<string>('storage.provider');
            const Driver = Object.hasOwn(drivers, name) ? drivers[name] : undefined;
            if (!Driver) {
              throw new Error(
                `No storage driver named "${name}". Registered: ${Object.keys(drivers).join(', ')}.`,
              );
            }
            return new Driver(configService);
          },
          inject: [ConfigService],
        },
      ],
      exports: [StorageService],
    };
  }
}
