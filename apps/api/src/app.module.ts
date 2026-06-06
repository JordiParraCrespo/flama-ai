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
import { auth } from './auth/auth';
import { AuthModule } from './auth/auth.module';
import {
  appConfig,
  databaseConfig,
  emailConfig,
  oauthConfig,
  redisConfig,
  storageConfig,
} from './config';
import { HealthModule } from './health/health.module';
import { QueueModule } from './queue/queue.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, emailConfig, storageConfig, oauthConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        autoLoadEntities: true,
        synchronize: configService.get('app.nodeEnv') !== 'production',
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
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
    UsersModule,
    HealthModule,
    QueueModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
})
export class AppModule {}
