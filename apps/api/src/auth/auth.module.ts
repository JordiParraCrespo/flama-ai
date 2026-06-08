import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { Session } from './entities/session.entity';
import { Verification } from './entities/verification.entity';
import { PoliciesGuard } from './guards/policies.guard';

/**
 * Registers the Better Auth tables with TypeORM (so the schema is created /
 * migrated alongside the rest of the app) and exposes the CASL-based
 * {@link PoliciesGuard} used for authorization.
 *
 * The Better Auth HTTP handler itself is wired up via
 * `AuthModule.forRoot({ auth })` from `@thallesp/nestjs-better-auth` in
 * the root `AppModule`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Session, Account, Verification])],
  providers: [PoliciesGuard],
  exports: [PoliciesGuard],
})
export class AuthModule {}
