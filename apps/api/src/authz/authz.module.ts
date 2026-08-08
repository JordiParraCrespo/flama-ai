import { AuthzModule as AuthzKernelModule } from '@flama/backend-authz';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ApiTokenResource } from '../api-tokens/api-tokens.resource';
import { BillingResource } from '../billing/billing.resource';
import { ORGANIZATION_RESOURCES } from '../organizations/organizations.resource';
import { RoleResource } from '../roles/roles.resource';
import { UserResource } from '../users/users.resource';
import { FindAuthzCatalogHttpController } from './queries/find-catalog/find-catalog.http.controller';
import { FindAuthzCatalogQueryHandler } from './queries/find-catalog/find-catalog.query-handler';

/**
 * Wires the authorization kernel into the application and registers the
 * platform's own resources.
 *
 * Feature modules register their own declarations through
 * `AuthzKernelModule.forFeature([...])`; the ones collected here belong to
 * modules that predate the kernel and have no row-level scoping of their own.
 */
@Module({
  imports: [
    CqrsModule,
    AuthzKernelModule.forFeature([
      UserResource,
      RoleResource,
      ApiTokenResource,
      BillingResource,
      ...ORGANIZATION_RESOURCES,
    ]),
  ],
  controllers: [FindAuthzCatalogHttpController],
  providers: [FindAuthzCatalogQueryHandler],
})
export class AuthzModule {}
