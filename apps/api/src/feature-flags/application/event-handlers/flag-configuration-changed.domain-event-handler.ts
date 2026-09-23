import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { FlagChangeRepositoryPort } from '../../database/flag-change.repository.port';
import { FlagConfigurationChangedDomainEvent } from '../../domain/events/flag-configuration-changed.domain-event';
import { FLAG_CHANGE_REPOSITORY, FLAG_EVALUATOR } from '../../feature-flags.di-tokens';
import type { FlagEvaluatorPort } from '../flag-evaluator.port';

/**
 * Two consequences of every flag or segment change, delivered from the outbox
 * after the change commits:
 *
 * 1. an entry on the audit trail — who, what, why, and the before/after;
 * 2. an immediate snapshot reload on this replica, so the person who pulled
 *    the switch sees it hold on their next request instead of up to a poll
 *    interval later. Other replicas notice on their next poll.
 *
 * Throwing on a failed audit write is deliberate: the relay retries the row
 * with backoff, and a change that is live but unaudited is the one outcome a
 * flag system in a regulated product cannot have.
 */
@Injectable()
export class FlagConfigurationChangedDomainEventHandler {
  constructor(
    @Inject(FLAG_CHANGE_REPOSITORY)
    private readonly changes: FlagChangeRepositoryPort,
    @Inject(FLAG_EVALUATOR)
    private readonly evaluator: FlagEvaluatorPort,
  ) {}

  @OnEvent(FlagConfigurationChangedDomainEvent.name)
  async handle(event: FlagConfigurationChangedDomainEvent): Promise<void> {
    await this.changes.record({
      id: event.id,
      subjectType: event.subjectType,
      subjectKey: event.subjectKey,
      action: event.action,
      actorId: event.actorId ?? null,
      comment: event.comment ?? null,
      before: event.before ?? null,
      after: event.after ?? null,
      createdAt: new Date(event.metadata?.timestamp ?? Date.now()),
    });
    await this.evaluator.refresh();
  }
}
