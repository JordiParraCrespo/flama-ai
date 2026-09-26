import { AuthzModule as AuthzKernelModule } from '@flama/backend-authz';
import { Global, Module, type Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiTokenResource } from '../api-tokens/api-tokens.resource';
import { FeatureFlagResource } from '../feature-flags/feature-flags.resource';
// flama:begin organizations
import { MemberOrmEntity } from '../organizations/database/member.orm-entity';
import { TeamOrmEntity } from '../organizations/database/team.orm-entity';
import { TeamMemberOrmEntity } from '../organizations/database/team-member.orm-entity';
import { ORGANIZATION_RESOURCES } from '../organizations/organizations.resource';
// flama:end organizations
import { RoleOrmEntity } from '../roles/database/role.orm-entity';
import { RoleResource } from '../roles/roles.resource';
import { UserResource } from '../users/users.resource';
// flama:begin organizations
import { AccessGrantMapper } from './access-grant.mapper';
import { ActiveOrganizationResolver } from './application/active-organization.resolver';
import { PrincipalResidencyChecker } from './application/principal-residency.policy';
import { SCOPE_RESOLVER_PROVIDER } from './application/scope.resolver';
import { ACCESS_GRANT_REPOSITORY } from './authz.di-tokens';
import { CreateAccessGrantCommandHandler } from './commands/create-access-grant/create-access-grant.command-handler';
import { CreateAccessGrantHttpController } from './commands/create-access-grant/create-access-grant.http.controller';
import { RevokeAccessGrantCommandHandler } from './commands/revoke-access-grant/revoke-access-grant.command-handler';
import { RevokeAccessGrantHttpController } from './commands/revoke-access-grant/revoke-access-grant.http.controller';
import { AccessGrantOrmEntity } from './database/access-grant.orm-entity';
import { AccessGrantRepository } from './database/access-grant.repository';
import { AccessScopeInterceptor } from './interceptors/access-scope.interceptor';
import { FindAccessGrantsHttpController } from './queries/find-access-grants/find-access-grants.http.controller';
import { FindAccessGrantsQueryHandler } from './queries/find-access-grants/find-access-grants.query-handler';
// flama:end organizations
import { FindAuthzCatalogHttpController } from './queries/find-catalog/find-catalog.http.controller';
import { FindAuthzCatalogQueryHandler } from './queries/find-catalog/find-catalog.query-handler';

// Static routes before parameterized ones.
const httpControllers = [
  FindAuthzCatalogHttpController,
  // flama:begin organizations
  FindAccessGrantsHttpController,
  CreateAccessGrantHttpController,
  RevokeAccessGrantHttpController,
  // flama:end organizations
];

const queryHandlers: Provider[] = [FindAuthzCatalogQueryHandler];

/**
 * Wires the authorization kernel into the application: every module's resource
 * declarations, and the catalog the role builder and token picker read.
 *
 * With organizations it also owns the access-grant aggregate and the
 * request-scoped infrastructure that reads it (`ScopeResolver`,
 * `AccessScopeInterceptor`) — the grants are the data the resolver reads, so
 * splitting them into a separate module would only buy a circular import.
 *
 * Global for the same reason `RolesModule` is: any feature module's controllers
 * apply `AccessScopeInterceptor`, and importing this everywhere would create
 * cycles with the modules it already depends on.
 */
@Global()
@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      RoleOrmEntity,
      // flama:begin organizations
      AccessGrantOrmEntity,
      MemberOrmEntity,
      TeamOrmEntity,
      TeamMemberOrmEntity,
      // flama:end organizations
    ]),
    AuthzKernelModule.forFeature([
      UserResource,
      RoleResource,
      ApiTokenResource,
      FeatureFlagResource,
      // flama:begin organizations
      ...ORGANIZATION_RESOURCES,
      // flama:end organizations
    ]),
  ],
  controllers: [...httpControllers],
  providers: [
    ...queryHandlers,
    // flama:begin organizations
    CreateAccessGrantCommandHandler,
    RevokeAccessGrantCommandHandler,
    FindAccessGrantsQueryHandler,
    AccessGrantMapper,
    { provide: ACCESS_GRANT_REPOSITORY, useClass: AccessGrantRepository },
    ActiveOrganizationResolver,
    PrincipalResidencyChecker,
    AccessScopeInterceptor,
    SCOPE_RESOLVER_PROVIDER,
    // flama:end organizations
  ],
  exports: [
    TypeOrmModule,
    // flama:begin organizations
    SCOPE_RESOLVER_PROVIDER,
    ACCESS_GRANT_REPOSITORY,
    AccessScopeInterceptor,
    ActiveOrganizationResolver,
    // flama:end organizations
  ],
})
export class AuthzModule {}
