import { AppError } from '@flama/backend-core';
import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { DomainRepositoryPort } from '../../database/domain.repository.port';
import { DomainErrors } from '../../domain/domain.errors';
import { DOMAIN_REPOSITORY } from '../../domain.di-tokens';
import { UpdateDomainCommand } from './update-domain.command';

/**
 * Command handler for updating a tracked domain. Status transitions are the
 * aggregate's business — it raises the event that starts or stops metric
 * ingestion — so this handler only loads, delegates and saves.
 */
@CommandHandler(UpdateDomainCommand)
export class UpdateDomainService implements ICommandHandler<UpdateDomainCommand, AggregateID> {
  constructor(
    @Inject(DOMAIN_REPOSITORY)
    private readonly domainRepository: DomainRepositoryPort,
  ) {}

  async execute(command: UpdateDomainCommand): Promise<AggregateID> {
    const found = await this.domainRepository.findOneById(command.domainId);
    if (found.isNone() || found.unwrap().organizationId !== command.organizationId) {
      throw new AppError(DomainErrors.NOT_FOUND, {
        detail: `No domain with id ${command.domainId}`,
        extensions: { domainId: command.domainId },
      });
    }

    const domain = found.unwrap();

    domain.update({
      protocol: command.protocol,
      status: command.status,
      ownerId: command.ownerId,
    });

    await this.domainRepository.save(domain);
    return domain.id;
  }
}
