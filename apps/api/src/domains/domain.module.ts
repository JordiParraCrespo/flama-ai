import { Module, type Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberOrmEntity } from '../organizations/database/member.orm-entity';
import { DomainRemovedDomainEventHandler } from './application/event-handlers/domain-removed.domain-event-handler';
import { ConnectDomainHttpController } from './commands/connect-domain/connect-domain.http.controller';
import { ConnectDomainService } from './commands/connect-domain/connect-domain.service';
import { RemoveDomainHttpController } from './commands/remove-domain/remove-domain.http.controller';
import { RemoveDomainService } from './commands/remove-domain/remove-domain.service';
import { SetUserDomainAccessHttpController } from './commands/set-user-domain-access/set-user-domain-access.http.controller';
import { SetUserDomainAccessService } from './commands/set-user-domain-access/set-user-domain-access.service';
import { UpdateDomainHttpController } from './commands/update-domain/update-domain.http.controller';
import { UpdateDomainService } from './commands/update-domain/update-domain.service';
import { DomainOrmEntity } from './database/domain.orm-entity';
import { DomainRepository } from './database/domain.repository';
import { OrganizationMembershipRepository } from './database/organization-membership.repository';
import { UserDomainAccessOrmEntity } from './database/user-domain-access.orm-entity';
import { UserDomainAccessRepository } from './database/user-domain-access.repository';
import {
  DOMAIN_REPOSITORY,
  ORGANIZATION_MEMBERSHIP_REPOSITORY,
  USER_DOMAIN_ACCESS_REPOSITORY,
} from './domain.di-tokens';
import { DomainMapper } from './domain.mapper';
import { FindDomainByIdHttpController } from './queries/find-domain-by-id/find-domain-by-id.http.controller';
import { FindDomainByIdQueryHandler } from './queries/find-domain-by-id/find-domain-by-id.query-handler';
import { FindDomainsHttpController } from './queries/find-domains/find-domains.http.controller';
import { FindDomainsQueryHandler } from './queries/find-domains/find-domains.query-handler';
import { FindUserDomainAccessHttpController } from './queries/find-user-domain-access/find-user-domain-access.http.controller';
import { FindUserDomainAccessQueryHandler } from './queries/find-user-domain-access/find-user-domain-access.query-handler';
import { DomainAccessContributor } from './services/domain-access.contributor';

// Controller registration order matters: the collection route must be matched
// before `:id`. The two `users/:userId/domains` controllers live here rather
// than in the users module because domain access is this module's data.
const httpControllers = [
  FindDomainsHttpController,
  ConnectDomainHttpController,
  FindDomainByIdHttpController,
  UpdateDomainHttpController,
  RemoveDomainHttpController,
  FindUserDomainAccessHttpController,
  SetUserDomainAccessHttpController,
];

const commandHandlers: Provider[] = [
  ConnectDomainService,
  UpdateDomainService,
  RemoveDomainService,
  SetUserDomainAccessService,
];

const queryHandlers: Provider[] = [
  FindDomainsQueryHandler,
  FindDomainByIdQueryHandler,
  FindUserDomainAccessQueryHandler,
];

const eventHandlers: Provider[] = [DomainRemovedDomainEventHandler];

const mappers: Provider[] = [DomainMapper];

const repositories: Provider[] = [
  { provide: DOMAIN_REPOSITORY, useClass: DomainRepository },
  {
    provide: USER_DOMAIN_ACCESS_REPOSITORY,
    useClass: UserDomainAccessRepository,
  },
  {
    provide: ORGANIZATION_MEMBERSHIP_REPOSITORY,
    useClass: OrganizationMembershipRepository,
  },
];

// Contributes the per-domain narrowing rules to every ability the
// `PoliciesGuard` builds. It registers itself with the global
// `AbilityContributorRegistry` on init — see
// `roles/services/ability-contributor.ts`.
const abilityContributors: Provider[] = [DomainAccessContributor];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([DomainOrmEntity, UserDomainAccessOrmEntity, MemberOrmEntity]),
  ],
  controllers: [...httpControllers],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
    ...mappers,
    ...repositories,
    ...abilityContributors,
  ],
  exports: [DOMAIN_REPOSITORY, USER_DOMAIN_ACCESS_REPOSITORY, DomainMapper, TypeOrmModule],
})
export class DomainsModule {}
