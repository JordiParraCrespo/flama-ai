import {
  type DynamicModule,
  Global,
  type InjectionToken,
  Module,
  type ModuleMetadata,
  type OptionalFactoryDependency,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { type RedisCacheOptions, RedisCacheService } from './redis-cache.service';

/**
 * `RedisCacheOptions` built from the app's providers, for an option that
 * needs one (an `onRead` observer that counts reads on a metric).
 */
export interface CacheModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: (InjectionToken | OptionalFactoryDependency)[];
  /**
   * Gets the `inject` providers, in order, and returns the cache's options.
   * `never[]` lets a factory name its own parameter types without the
   * module's public type widening to `any`.
   */
  useFactory: (...args: never[]) => RedisCacheOptions;
}

const CACHE_OPTIONS = Symbol('CACHE_OPTIONS');

@Global()
@Module({})
export class CacheModule {
  static register(options: RedisCacheOptions = {}): DynamicModule {
    return CacheModule.registerAsync({ useFactory: () => options });
  }

  static registerAsync(options: CacheModuleAsyncOptions): DynamicModule {
    return {
      module: CacheModule,
      imports: options.imports ?? [],
      providers: [
        { provide: CACHE_OPTIONS, inject: options.inject ?? [], useFactory: options.useFactory },
        {
          provide: CacheService,
          useFactory: (configService: ConfigService, cacheOptions: RedisCacheOptions) => {
            return new RedisCacheService(configService, cacheOptions);
          },
          inject: [ConfigService, CACHE_OPTIONS],
        },
      ],
      exports: [CacheService],
    };
  }
}
