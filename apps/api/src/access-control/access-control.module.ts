import { Global, Module, type Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberOrmEntity } from '../organizations/database/member.orm-entity';
import {
  ORGANIZATION_MEMBERSHIP_REPOSITORY,
  RESOURCE_ACCESS_REPOSITORY,
} from './access-control.di-tokens';
import { OrganizationMembershipRepository } from './database/organization-membership.repository';
import { ResourceAccessRepository } from './database/resource-access.repository';
import { UserResourceAccessOrmEntity } from './database/user-resource-access.orm-entity';
import { ResourceAccessContributor } from './services/resource-access.contributor';
import { ResourceAccessService } from './services/resource-access.service';
import { RestrictableResourceRegistry } from './services/restrictable-resource.registry';

const repositories: Provider[] = [
  { provide: RESOURCE_ACCESS_REPOSITORY, useClass: ResourceAccessRepository },
  {
    provide: ORGANIZATION_MEMBERSHIP_REPOSITORY,
    useClass: OrganizationMembershipRepository,
  },
];

/**
 * Per-instance resource access: "this user may only reach these three domains".
 *
 * Generic on purpose. A feature module registers a `RestrictableResource` with
 * the {@link RestrictableResourceRegistry} and gets storage, CASL narrowing and
 * the listing filter for free — it does not add a table, a contributor or a
 * guard helper of its own.
 *
 * `@Global` for the same reason the roles module is: the registry and the
 * service are consumed by feature modules, and the single
 * {@link ResourceAccessContributor} must reach the ability the `PoliciesGuard`
 * builds on every request, without any module importing another.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserResourceAccessOrmEntity, MemberOrmEntity])],
  providers: [
    ...repositories,
    RestrictableResourceRegistry,
    ResourceAccessService,
    ResourceAccessContributor,
  ],
  exports: [
    RESOURCE_ACCESS_REPOSITORY,
    ORGANIZATION_MEMBERSHIP_REPOSITORY,
    RestrictableResourceRegistry,
    ResourceAccessService,
    TypeOrmModule,
  ],
})
export class AccessControlModule {}
