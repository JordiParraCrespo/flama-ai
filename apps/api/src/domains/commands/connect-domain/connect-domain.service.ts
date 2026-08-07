import { AppError } from '@flama/backend-core';
import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { DomainRepositoryPort } from '../../database/domain.repository.port';
import { DomainEntity } from '../../domain/domain.entity';
import { DomainErrors } from '../../domain/domain.errors';
import { Hostname } from '../../domain/value-objects/hostname.value-object';
import { DOMAIN_REPOSITORY } from '../../domain.di-tokens';
import { ConnectDomainCommand } from './connect-domain.command';

/**
 * Command handler for tracking a new domain. The uniqueness check is
 * per-organization and belt-and-braces: the unique index is the real guard
 * against a concurrent duplicate, this exists so the common case gets a clean
 * 409 rather than a driver error.
 */
@CommandHandler(ConnectDomainCommand)
export class ConnectDomainService implements ICommandHandler<ConnectDomainCommand, AggregateID> {
  constructor(
    @Inject(DOMAIN_REPOSITORY)
    private readonly domainRepository: DomainRepositoryPort,
  ) {}

  async execute(command: ConnectDomainCommand): Promise<AggregateID> {
    const hostname = Hostname.of(command.hostname);

    const existing = await this.domainRepository.findOneByHostname(
      command.organizationId,
      hostname.value,
    );
    if (existing.isSome()) {
      throw new AppError(DomainErrors.ALREADY_EXISTS, {
        detail: `${hostname.value} is already tracked in this organization`,
        extensions: { hostname: hostname.value },
      });
    }

    const domain = DomainEntity.connect({
      organizationId: command.organizationId,
      hostname,
      protocol: command.protocol,
      ownerId: command.ownerId ?? null,
      importSearchConsole: command.importSearchConsole,
      runInitialCrawl: command.runInitialCrawl,
    });

    await this.domainRepository.insert(domain);
    return domain.id;
  }
}
