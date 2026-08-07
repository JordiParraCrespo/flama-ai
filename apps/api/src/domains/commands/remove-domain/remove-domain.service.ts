import { AppError } from '@flama/backend-core';
import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { DomainRepositoryPort } from '../../database/domain.repository.port';
import { DomainErrors } from '../../domain/domain.errors';
import { DOMAIN_REPOSITORY } from '../../domain.di-tokens';
import { RemoveDomainCommand } from './remove-domain.command';

/**
 * Command handler for removing a tracked domain. `remove()` raises the event
 * that owes the downstream cleanup (detaching captured leads, dropping cached
 * metrics); the repository stages it on the outbox in the same transaction as
 * the delete, so the cleanup cannot be lost if this process dies.
 */
@CommandHandler(RemoveDomainCommand)
export class RemoveDomainService implements ICommandHandler<RemoveDomainCommand, AggregateID> {
  constructor(
    @Inject(DOMAIN_REPOSITORY)
    private readonly domainRepository: DomainRepositoryPort,
  ) {}

  async execute(command: RemoveDomainCommand): Promise<AggregateID> {
    const found = await this.domainRepository.findOneById(command.domainId);
    if (found.isNone() || found.unwrap().organizationId !== command.organizationId) {
      throw new AppError(DomainErrors.NOT_FOUND, {
        detail: `No domain with id ${command.domainId}`,
        extensions: { domainId: command.domainId },
      });
    }

    const domain = found.unwrap();
    domain.remove();

    await this.domainRepository.delete(domain);
    return domain.id;
  }
}
