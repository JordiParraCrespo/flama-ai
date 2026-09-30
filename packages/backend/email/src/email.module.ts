import { type DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

/** An email driver: an `EmailService` built from the app's configuration. */
export type EmailDriver = new (configService: ConfigService) => EmailService;

/** The drivers an app can run on, keyed by the name `email.provider` holds. */
export type EmailDrivers = Record<string, EmailDriver>;

@Global()
@Module({})
export class EmailModule {
  /**
   * Binds `EmailService` to the driver `email.provider` names, out of the ones
   * the app passes. The app's config schema accepts exactly those names; the
   * lookup still refuses any other, so a name no driver answers to never falls
   * through to some other driver.
   */
  static register(drivers: EmailDrivers): DynamicModule {
    return {
      module: EmailModule,
      providers: [
        {
          provide: EmailService,
          useFactory: (configService: ConfigService) => {
            const name = configService.getOrThrow<string>('email.provider');
            const Driver = Object.hasOwn(drivers, name) ? drivers[name] : undefined;
            if (!Driver) {
              throw new Error(
                `No email driver named "${name}". Registered: ${Object.keys(drivers).join(', ')}.`,
              );
            }
            return new Driver(configService);
          },
          inject: [ConfigService],
        },
      ],
      exports: [EmailService],
    };
  }
}
