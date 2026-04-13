import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './services/cache/cache.service';
import { RedisCacheService } from './services/cache/redis-cache.service';
import { ConsoleEmailService } from './services/email/console-email.service';
import { EmailService } from './services/email/email.service';
import { NodemailerEmailService } from './services/email/nodemailer-email.service';
import { ResendEmailService } from './services/email/resend-email.service';
import { LocalStorageService } from './services/storage/local-storage.service';
import { S3StorageService } from './services/storage/s3-storage.service';
import { StorageService } from './services/storage/storage.service';

@Global()
@Module({
  providers: [
    {
      provide: EmailService,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get('EMAIL_PROVIDER') || 'console';
        switch (provider) {
          case 'nodemailer':
            return new NodemailerEmailService(configService);
          case 'resend':
            return new ResendEmailService(configService);
          default:
            return new ConsoleEmailService();
        }
      },
      inject: [ConfigService],
    },
    {
      provide: StorageService,
      useFactory: (configService: ConfigService) => {
        const provider = configService.get('STORAGE_PROVIDER') || 'local';
        switch (provider) {
          case 's3':
            return new S3StorageService(configService);
          default:
            return new LocalStorageService(configService);
        }
      },
      inject: [ConfigService],
    },
    {
      provide: CacheService,
      useFactory: (configService: ConfigService) => {
        return new RedisCacheService(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [EmailService, StorageService, CacheService],
})
export class CommonModule {}
