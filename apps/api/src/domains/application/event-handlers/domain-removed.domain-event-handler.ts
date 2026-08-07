import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { UserDomainAccessRepositoryPort } from '../../database/user-domain-access.repository.port';
import { USER_DOMAIN_ACCESS_REPOSITORY } from '../../domain.di-tokens';

/**
 * Payload delivered by the outbox relay. Handlers receive the deserialized
 * event fields, not the domain-event class instance.
 */
interface DomainRemovedPayload {
  aggregateId: string;
  organizationId: string;
  hostname: string;
}

/**
 * Cleans up after a removed domain.
 *
 * The access join is keyed by `domainId` with no aggregate of its own, so
 * orphaned rows would otherwise linger and could grant access to a recycled id.
 */
@Injectable()
export class DomainRemovedDomainEventHandler {
  private readonly logger = new Logger(DomainRemovedDomainEventHandler.name);

  constructor(
    @Inject(USER_DOMAIN_ACCESS_REPOSITORY)
    private readonly userDomainAccessRepository: UserDomainAccessRepositoryPort,
  ) {}

  @OnEvent('DomainRemovedDomainEvent')
  async handle(event: DomainRemovedPayload): Promise<void> {
    await this.userDomainAccessRepository.deleteForDomain(event.aggregateId);

    this.logger.log({
      message: 'Cleaned up access rows for removed domain',
      domainId: event.aggregateId,
      organizationId: event.organizationId,
    });
  }
}
