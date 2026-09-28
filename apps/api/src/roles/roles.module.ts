import { Global, Module, type Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ABILITY } from '../auth/auth.di-tokens';
import { UsersModule } from '../users/user.module';
import { AbilityFactory } from './application/ability.factory';
import { RoleGrantPolicy } from './application/role-grant.policy';
import { AssignUserRolesCommandHandler } from './commands/assign-user-roles/assign-user-roles.command-handler';
import { AssignUserRolesHttpController } from './commands/assign-user-roles/assign-user-roles.http.controller';
import { CreateRoleCommandHandler } from './commands/create-role/create-role.command-handler';
import { CreateRoleHttpController } from './commands/create-role/create-role.http.controller';
import { DeleteRoleCommandHandler } from './commands/delete-role/delete-role.command-handler';
import { DeleteRoleHttpController } from './commands/delete-role/delete-role.http.controller';
import { UpdateRoleCommandHandler } from './commands/update-role/update-role.command-handler';
import { UpdateRoleHttpController } from './commands/update-role/update-role.http.controller';
import { UpdateRolePermissionsCommandHandler } from './commands/update-role-permissions/update-role-permissions.command-handler';
import { UpdateRolePermissionsHttpController } from './commands/update-role-permissions/update-role-permissions.http.controller';
import { RoleOrmEntity } from './database/role.orm-entity';
import { RoleRepository } from './database/role.repository';
import { UserRoleOrmEntity } from './database/user-role.orm-entity';
import { UserRoleRepository } from './database/user-role.repository';
import { FindRoleByIdHttpController } from './queries/find-role-by-id/find-role-by-id.http.controller';
import { FindRoleByIdQueryHandler } from './queries/find-role-by-id/find-role-by-id.query-handler';
import { FindRolesHttpController } from './queries/find-roles/find-roles.http.controller';
import { FindRolesQueryHandler } from './queries/find-roles/find-roles.query-handler';
import { FindUserRolesHttpController } from './queries/find-user-roles/find-user-roles.http.controller';
import { FindUserRolesQueryHandler } from './queries/find-user-roles/find-user-roles.query-handler';
import { ROLE_REPOSITORY, USER_ROLE_REPOSITORY } from './roles.di-tokens';
import { RoleMapper } from './roles.mapper';

// Register list/static routes before parameterized ones.
const httpControllers = [
  FindRolesHttpController,
  CreateRoleHttpController,
  FindRoleByIdHttpController,
  UpdateRoleHttpController,
  UpdateRolePermissionsHttpController,
  DeleteRoleHttpController,
  FindUserRolesHttpController,
  AssignUserRolesHttpController,
];

const commandHandlers: Provider[] = [
  CreateRoleCommandHandler,
  UpdateRoleCommandHandler,
  UpdateRolePermissionsCommandHandler,
  DeleteRoleCommandHandler,
  AssignUserRolesCommandHandler,
];

const queryHandlers: Provider[] = [
  FindRolesQueryHandler,
  FindRoleByIdQueryHandler,
  FindUserRolesQueryHandler,
];

const mappers: Provider[] = [RoleMapper];

const repositories: Provider[] = [
  { provide: ROLE_REPOSITORY, useClass: RoleRepository },
  { provide: USER_ROLE_REPOSITORY, useClass: UserRoleRepository },
];

/**
 * Roles / RBAC module. Marked `@Global` so the auth kernel's `ABILITY` port
 * (asked by `PoliciesGuard` in every feature module) and the repository ports
 * are available application-wide without circular module imports.
 *
 * `AbilityFactory` is bound to `ABILITY` and only the token is exported: every
 * module, this one included, asks "what may this principal do" through the
 * port, so none can reach past it to the adapter.
 */
@Global()
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([RoleOrmEntity, UserRoleOrmEntity]), UsersModule],
  controllers: [...httpControllers],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...mappers,
    ...repositories,
    AbilityFactory,
    { provide: ABILITY, useExisting: AbilityFactory },
    RoleGrantPolicy,
  ],
  exports: [
    ROLE_REPOSITORY,
    USER_ROLE_REPOSITORY,
    ABILITY,
    RoleGrantPolicy,
    RoleMapper,
    TypeOrmModule,
  ],
})
export class RolesModule {}
