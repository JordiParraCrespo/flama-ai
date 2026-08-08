import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResourceAccessService } from '../../../access-control/services/resource-access.service';
import { DOMAIN_RESOURCE_TYPE } from '../../services/domain-restrictable-resource';

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
 * `user_resource_access.resourceId` is polymorphic and so carries no foreign
 * key — nothing cascades. Revoking here is what stops orphaned rows lingering
 * and granting access to a recycled id.
 */
@Injectable()
export class DomainRemovedDomainEventHandler {
  private readonly logger = new Logger(DomainRemovedDomainEventHandler.name);

  constructor(private readonly resourceAccess: ResourceAccessService) {}

  @OnEvent('DomainRemovedDomainEvent')
  async handle(event: DomainRemovedPayload): Promise<void> {
    await this.resourceAccess.revokeResource(DOMAIN_RESOURCE_TYPE, event.aggregateId);

    this.logger.log({
      message: 'Revoked access grants for removed domain',
      domainId: event.aggregateId,
      organizationId: event.organizationId,
    });
  }
}
