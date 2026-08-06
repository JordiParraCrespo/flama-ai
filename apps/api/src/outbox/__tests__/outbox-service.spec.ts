import { DomainEvent, type DomainEventProps, OutboxService } from '@flama/backend-ddd';
import type { DataSource, EntityManager } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

class ThingDeletedDomainEvent extends DomainEvent {
  readonly name: string;

  constructor(props: DomainEventProps<ThingDeletedDomainEvent>) {
    super(props);
    this.name = props.name;
  }
}

describe('OutboxService', () => {
  const managerWith = (insert: ReturnType<typeof vi.fn>) =>
    ({ getRepository: () => ({ insert }) }) as unknown as EntityManager;

  describe('stageEvents', () => {
    it('writes one self-explaining row per event through the given manager', async () => {
      const insert = vi.fn().mockResolvedValue(undefined);
      const service = new OutboxService({} as DataSource);
      const event = new ThingDeletedDomainEvent({
        aggregateId: 'agg-1',
        name: 'thing',
        reason: 'Thing was deleted; cleanup is owed',
      });

      await service.stageEvents(managerWith(insert), [event]);

      expect(insert).toHaveBeenCalledTimes(1);
      const [rows] = insert.mock.calls[0];
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        channel: 'event',
        eventName: 'ThingDeletedDomainEvent',
        aggregateId: 'agg-1',
        reason: 'Thing was deleted; cleanup is owed',
        status: 'pending',
        correlationId: event.metadata.correlationId,
      });
      // The payload is the serialized event: what listeners will receive.
      expect(rows[0].payload).toMatchObject({
        aggregateId: 'agg-1',
        name: 'thing',
      });
    });

    it('falls back to a generated reason when the event carries none', async () => {
      const insert = vi.fn().mockResolvedValue(undefined);
      const service = new OutboxService({} as DataSource);
      const event = new ThingDeletedDomainEvent({
        aggregateId: 'agg-2',
        name: 'thing',
      });

      await service.stageEvents(managerWith(insert), [event]);

      const [rows] = insert.mock.calls[0];
      expect(rows[0].reason).toContain('ThingDeletedDomainEvent');
      expect(rows[0].reason).toContain('agg-2');
    });

    it('does nothing for an empty event list', async () => {
      const insert = vi.fn();
      const service = new OutboxService({} as DataSource);
      await service.stageEvents(managerWith(insert), []);
      expect(insert).not.toHaveBeenCalled();
    });
  });

  describe('stageJob', () => {
    it('writes a queue row targeting the named BullMQ queue', async () => {
      const insert = vi.fn().mockResolvedValue(undefined);
      const service = new OutboxService({} as DataSource);

      await service.stageJob(managerWith(insert), {
        queue: 'email',
        jobName: 'send-verification',
        payload: { to: 'a@b.c' },
        reason: 'User signed up; a verification email is owed',
      });

      expect(insert.mock.calls[0][0]).toMatchObject({
        channel: 'queue',
        topic: 'email',
        eventName: 'send-verification',
        payload: { to: 'a@b.c' },
        reason: 'User signed up; a verification email is owed',
      });
    });
  });

  describe('markFailed', () => {
    const record = (attempts: number) =>
      ({ id: 'row-1', attempts }) as Parameters<OutboxService['markFailed']>[0];

    it('returns the row to pending with backoff while attempts remain', async () => {
      const query = vi.fn().mockResolvedValue([]);
      const service = new OutboxService({ query } as unknown as DataSource, {
        maxAttempts: 3,
        baseRetryDelayMs: 1000,
      });

      await service.markFailed(record(2), 'boom');

      const [, params] = query.mock.calls[0];
      // [id, status, error, delayMs] — attempt 2 backs off 1000 * 2^1.
      expect(params).toEqual(['row-1', 'pending', 'boom', 2000]);
    });

    it('parks the row as failed once attempts are exhausted', async () => {
      const query = vi.fn().mockResolvedValue([]);
      const service = new OutboxService({ query } as unknown as DataSource, {
        maxAttempts: 3,
      });

      await service.markFailed(record(3), 'boom');

      const [, params] = query.mock.calls[0];
      expect(params[1]).toBe('failed');
    });

    it('caps the backoff at maxRetryDelayMs', async () => {
      const query = vi.fn().mockResolvedValue([]);
      const service = new OutboxService({ query } as unknown as DataSource, {
        maxAttempts: 100,
        baseRetryDelayMs: 1000,
        maxRetryDelayMs: 4000,
      });

      await service.markFailed(record(50), 'boom');

      const [, params] = query.mock.calls[0];
      expect(params[3]).toBe(4000);
    });
  });

  describe('wake', () => {
    it('runs the registered drainer and swallows its failure', async () => {
      const service = new OutboxService({} as DataSource);
      const drainer = vi.fn().mockRejectedValue(new Error('db gone'));
      service.registerDrainer(drainer);

      await expect(service.wake()).resolves.toBeUndefined();
      expect(drainer).toHaveBeenCalledTimes(1);
    });

    it('is a no-op with no drainer registered', async () => {
      const service = new OutboxService({} as DataSource);
      await expect(service.wake()).resolves.toBeUndefined();
    });
  });
});
