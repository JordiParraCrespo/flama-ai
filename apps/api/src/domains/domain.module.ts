import { Module, type Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { DOMAIN_REPOSITORY } from './domain.di-tokens';
import { DomainMapper } from './domain.mapper';
import { FindDomainByIdHttpController } from './queries/find-domain-by-id/find-domain-by-id.http.controller';
import { FindDomainByIdQueryHandler } from './queries/find-domain-by-id/find-domain-by-id.query-handler';
import { FindDomainsHttpController } from './queries/find-domains/find-domains.http.controller';
import { FindDomainsQueryHandler } from './queries/find-domains/find-domains.query-handler';
import { FindUserDomainAccessHttpController } from './queries/find-user-domain-access/find-user-domain-access.http.controller';
import { FindUserDomainAccessQueryHandler } from './queries/find-user-domain-access/find-user-domain-access.query-handler';
import { DomainRestrictableResourceRegistrar } from './services/domain-restrictable-resource';

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

const repositories: Provider[] = [{ provide: DOMAIN_REPOSITORY, useClass: DomainRepository }];

// Declares domains as a resource users can be restricted to a subset of. The
// storage, the CASL narrowing and the listing filter are generic — see
// `access-control/`.
const accessControl: Provider[] = [DomainRestrictableResourceRegistrar];

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([DomainOrmEntity])],
  controllers: [...httpControllers],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
    ...mappers,
    ...repositories,
    ...accessControl,
  ],
  exports: [DOMAIN_REPOSITORY, DomainMapper, TypeOrmModule],
})
export class DomainsModule {}
