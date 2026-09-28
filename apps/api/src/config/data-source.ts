import '@flama/env/load';
import { OutboxMessageSchema } from '@flama/backend-ddd';
import { DataSource } from 'typeorm';
// flama:begin api-tokens
// flama:end api-tokens
import { Account } from '../auth/database/account.orm-entity';
// flama:plugins entity-imports
import { Session } from '../auth/database/session.orm-entity';
import { Verification } from '../auth/database/verification.orm-entity';
// flama:begin organizations
import { AccessGrantOrmEntity } from '../authz/database/access-grant.orm-entity';
// flama:end organizations
// flama:plugins entity-imports-b-n
// flama:begin organizations
import { InvitationOrmEntity } from '../organizations/database/invitation.orm-entity';
import { MemberOrmEntity } from '../organizations/database/member.orm-entity';
import { OrganizationOrmEntity } from '../organizations/database/organization.orm-entity';
import { TeamOrmEntity } from '../organizations/database/team.orm-entity';
import { TeamMemberOrmEntity } from '../organizations/database/team-member.orm-entity';
// flama:end organizations
import { UserSettingsOrmEntity } from '../profile/database/user-settings.orm-entity';
import { RoleOrmEntity } from '../roles/database/role.orm-entity';
import { UserRoleOrmEntity } from '../roles/database/user-role.orm-entity';
import { UserOrmEntity } from '../users/database/user.orm-entity';

/**
 * Data source used by the TypeORM CLI (`migration:generate` / `migration:run` /
 * `migration:revert`). The runtime app configures TypeORM in `AppModule`.
 *
 * The migrations glob is resolved relative to this file so it works both when
 * run through ts-node (`src/`) and from the compiled output (`dist/`).
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'flama',
  password: process.env.DB_PASSWORD || 'flama',
  database: process.env.DB_DATABASE || 'flama',
  entities: [
    UserOrmEntity,
    UserSettingsOrmEntity,
    Session,
    Account,
    Verification,
    // flama:plugins entities
    RoleOrmEntity,
    // flama:begin organizations
    AccessGrantOrmEntity,
    // flama:end organizations
    UserRoleOrmEntity,
    // flama:begin organizations
    OrganizationOrmEntity,
    MemberOrmEntity,
    InvitationOrmEntity,
    TeamOrmEntity,
    TeamMemberOrmEntity,
    // flama:end organizations
    OutboxMessageSchema,
  ],
  migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
});
