import { AppError } from '@flama/backend-core';
import type { AggregateID } from '@flama/backend-ddd';
import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { DomainRepositoryPort } from '../../database/domain.repository.port';
import { DomainNotVerifiedError } from '../../domain/domain.entity';
import { DomainErrors } from '../../domain/domain.errors';
import { DOMAIN_REPOSITORY } from '../../domain.di-tokens';
import { UpdateDomainCommand } from './update-domain.command';

/**
 * Command handler for updating a tracked domain. Status transitions are the
 * aggregate's business: it refuses to activate an unverified domain, and that
 * refusal is translated to the HTTP catalog here so the domain layer stays free
 * of transport concerns.
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

    try {
      domain.update({
        protocol: command.protocol,
        status: command.status,
        ownerId: command.ownerId,
      });
    } catch (error) {
      if (error instanceof DomainNotVerifiedError) {
        throw new AppError(DomainErrors.NOT_VERIFIED, {
          detail: error.message,
          extensions: { domainId: domain.id },
        });
      }
      throw error;
    }

    await this.domainRepository.save(domain);
    return domain.id;
  }
}
