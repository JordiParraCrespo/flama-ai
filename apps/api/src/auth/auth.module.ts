import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationOrmEntity } from '../organizations/database/invitation.orm-entity';
import { MemberOrmEntity } from '../organizations/database/member.orm-entity';
import { OrganizationOrmEntity } from '../organizations/database/organization.orm-entity';
import { TeamOrmEntity } from '../organizations/database/team.orm-entity';
import { TeamMemberOrmEntity } from '../organizations/database/team-member.orm-entity';
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
 * the root `AppModule`. The organization/team tables are Better-Auth-owned too
 * (organization plugin) and are grouped here alongside session/account.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      Account,
      Verification,
      OrganizationOrmEntity,
      MemberOrmEntity,
      InvitationOrmEntity,
      TeamOrmEntity,
      TeamMemberOrmEntity,
    ]),
  ],
  providers: [PoliciesGuard],
  exports: [PoliciesGuard, TypeOrmModule],
})
export class AuthModule {}
