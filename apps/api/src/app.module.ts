import { CacheModule } from '@flama/backend-cache';
import { AllExceptionsFilter, RequestContextInterceptor } from '@flama/backend-core';
import { EmailModule } from '@flama/backend-email';
import { StorageModule } from '@flama/backend-storage';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { LoggerModule } from 'nestjs-pino';
import { AdminModule } from './admin/admin.module';
import { ApiTokensModule } from './api-tokens/api-tokens.module';
import { auth } from './auth/auth';
import { AuthModule } from './auth/auth.module';
import { ScopesGuard } from './auth/guards/scopes.guard';
import {
  appConfig,
  databaseConfig,
  emailConfig,
  oauthConfig,
  redisConfig,
  storageConfig,
} from './config';
import { HealthModule } from './health/health.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { QueueModule } from './queue/queue.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, emailConfig, storageConfig, oauthConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Under the test runner, skip migrations entirely: TypeORM would load
        // the .ts migration files through vitest's module system and crash.
        // Migrations are exercised separately against a real database.
        const isTest = configService.get('app.nodeEnv') === 'test';
        // Building the OpenAPI document only needs the module graph, not a
        // live database, so `pnpm generate:openapi` runs anywhere.
        const isSchemaOnly = process.env.OPENAPI_GENERATION === 'true';
        return {
          type: 'postgres',
          manualInitialization: isSchemaOnly,
          host: configService.get('database.host'),
          port: configService.get('database.port'),
          username: configService.get('database.username'),
          password: configService.get('database.password'),
          database: configService.get('database.database'),
          autoLoadEntities: true,
          // Schema is managed through versioned migrations, never auto-sync.
          synchronize: false,
          migrations: isTest ? [] : [`${__dirname}/migrations/*{.ts,.js}`],
          migrationsRun: !isTest,
        };
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
      // Integration tests drive many requests through the same pipeline in
      // seconds; rate limiting there measures nothing but the limit itself.
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          transport:
            configService.get('app.nodeEnv') !== 'production'
              ? { target: 'pino-pretty' }
              : undefined,
        },
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
        },
      }),
    }),
    EventEmitterModule.forRoot(),
    EmailModule.register(),
    StorageModule.register(),
    CacheModule.register(),
    BetterAuthModule.forRoot({ auth, disableGlobalAuthGuard: true }),
    AuthModule,
    ApiTokensModule,
    UsersModule,
    RolesModule,
    OrganizationsModule,
    AdminModule,
    HealthModule,
    QueueModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Registered globally so a route that forgets to declare its scope
    // requirements is closed to scoped credentials rather than open by
    // omission. Browser sessions pass straight through.
    { provide: APP_GUARD, useClass: ScopesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
})
export class AppModule {}
