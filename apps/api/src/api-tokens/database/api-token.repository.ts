import { type AggregateID, Paginated, type PaginatedQueryParams } from '@flama/backend-ddd';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { None, type Option, Some } from 'oxide.ts';
import { DataSource, IsNull, MoreThan, type Repository } from 'typeorm';
import { ApiTokenMapper } from '../api-tokens.mapper';
import type { ApiTokenEntity } from '../domain/api-token.entity';
import { ApiTokenOrmEntity } from './api-token.orm-entity';
import type { ApiTokenRepositoryPort } from './api-token.repository.port';

/**
 * TypeORM-backed adapter for the API token aggregate. Translates between the
 * domain entity and the persistence model via `ApiTokenMapper` and publishes
 * collected domain events once a write succeeds.
 */
@Injectable()
export class ApiTokenRepository implements ApiTokenRepositoryPort {
  constructor(
    @InjectRepository(ApiTokenOrmEntity)
    private readonly repository: Repository<ApiTokenOrmEntity>,
    private readonly dataSource: DataSource,
    private readonly mapper: ApiTokenMapper,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async insert(entity: ApiTokenEntity | ApiTokenEntity[]): Promise<void> {
    const entities = Array.isArray(entity) ? entity : [entity];
    const records = entities.map((e) => this.mapper.toPersistence(e));
    // Cast around TypeORM's `QueryDeepPartialEntity` recursion, which cannot
    // represent the jsonb array columns.
    await this.repository.insert(records as Parameters<typeof this.repository.insert>[0]);
    await Promise.all(entities.map((e) => this.publishEvents(e)));
  }

  async save(entity: ApiTokenEntity): Promise<ApiTokenEntity> {
    const record = await this.repository.save(this.mapper.toPersistence(entity));
    await this.publishEvents(entity);
    return this.mapper.toDomain(record);
  }

  async findOneById(id: string): Promise<Option<ApiTokenEntity>> {
    const record = await this.repository.findOneBy({ id });
    return record ? Some(this.mapper.toDomain(record)) : None;
  }

  async findOneByHash(tokenHash: string): Promise<Option<ApiTokenEntity>> {
    const record = await this.repository.findOneBy({ tokenHash });
    return record ? Some(this.mapper.toDomain(record)) : None;
  }

  async findByUserId(userId: string): Promise<ApiTokenEntity[]> {
    const records = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return records.map((record) => this.mapper.toDomain(record));
  }

  countActiveForUser(userId: string, now: Date): Promise<number> {
    return this.repository.count({
      where: [
        { userId, revokedAt: IsNull(), expiresAt: IsNull() },
        { userId, revokedAt: IsNull(), expiresAt: MoreThan(now) },
      ],
    });
  }

  async touchLastUsedAt(id: string, at: Date): Promise<void> {
    await this.repository.update({ id: id as AggregateID }, { lastUsedAt: at });
  }

  async findAll(): Promise<ApiTokenEntity[]> {
    const records = await this.repository.find();
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findAllPaginated(params: PaginatedQueryParams): Promise<Paginated<ApiTokenEntity>> {
    const [records, count] = await this.repository.findAndCount({
      skip: params.offset,
      take: params.limit,
      order: { createdAt: params.orderBy.param === 'asc' ? 'ASC' : 'DESC' },
    });
    return new Paginated({
      count,
      limit: params.limit,
      page: params.page,
      data: records.map((record) => this.mapper.toDomain(record)),
    });
  }

  async delete(entity: ApiTokenEntity): Promise<boolean> {
    const result = await this.repository.delete({
      id: entity.id as AggregateID,
    });
    await this.publishEvents(entity);
    return result.affected ? result.affected > 0 : false;
  }

  transaction<T>(handler: () => Promise<T>): Promise<T> {
    return this.dataSource.transaction(() => handler());
  }

  private async publishEvents(entity: ApiTokenEntity): Promise<void> {
    const events = entity.domainEvents;
    if (events.length === 0) return;
    await Promise.all(
      events.map((event) => this.eventEmitter.emitAsync(event.constructor.name, event)),
    );
    entity.clearEvents();
  }
}
