import { AuthzModule as AuthzKernelModule, SCOPE_RESOLVER } from '@flama/backend-authz';
import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiTokenResource } from '../api-tokens/api-tokens.resource';
import { BillingResource } from '../billing/billing.resource';
import { MemberOrmEntity } from '../organizations/database/member.orm-entity';
import { TeamOrmEntity } from '../organizations/database/team.orm-entity';
import { TeamMemberOrmEntity } from '../organizations/database/team-member.orm-entity';
import { ORGANIZATION_RESOURCES } from '../organizations/organizations.resource';
import { RoleResource } from '../roles/roles.resource';
import { UserResource } from '../users/users.resource';
import { AccessGrantOrmEntity } from './database/access-grant.orm-entity';
import { AccessScopeInterceptor } from './interceptors/access-scope.interceptor';
import { FindAuthzCatalogHttpController } from './queries/find-catalog/find-catalog.http.controller';
import { FindAuthzCatalogQueryHandler } from './queries/find-catalog/find-catalog.query-handler';
import { ActiveOrganizationResolver } from './services/active-organization.resolver';
import { ScopeResolver } from './services/scope.resolver';

/**
 * Wires the authorization kernel into the application: the resource registry,
 * the concrete scope resolver behind its port, and the interceptor a scoped
 * controller applies.
 *
 * Global, like `RolesModule` and for the same reason — any feature module's
 * controllers need `AccessScopeInterceptor`, and importing this everywhere
 * would mean a cycle for the modules it already depends on.
 */
@Global()
@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      AccessGrantOrmEntity,
      MemberOrmEntity,
      TeamOrmEntity,
      TeamMemberOrmEntity,
    ]),
    AuthzKernelModule.forFeature([
      UserResource,
      RoleResource,
      ApiTokenResource,
      BillingResource,
      ...ORGANIZATION_RESOURCES,
    ]),
  ],
  controllers: [FindAuthzCatalogHttpController],
  providers: [
    FindAuthzCatalogQueryHandler,
    ActiveOrganizationResolver,
    AccessScopeInterceptor,
    // Behind the port, so an application needing hierarchical scope resolution
    // (a manager seeing their reports' rows, a region → territory tree)
    // substitutes its own implementation without touching a call site.
    { provide: SCOPE_RESOLVER, useClass: ScopeResolver },
  ],
  exports: [SCOPE_RESOLVER, AccessScopeInterceptor, ActiveOrganizationResolver, TypeOrmModule],
})
export class AuthzModule {}
