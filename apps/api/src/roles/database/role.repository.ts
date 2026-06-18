import { type AggregateID, Paginated, type PaginatedQueryParams } from '@flama/backend-ddd';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { None, type Option, Some } from 'oxide.ts';
import { DataSource, ILike, In, type Repository } from 'typeorm';
import type { RoleEntity } from '../domain/role.entity';
import { RoleMapper } from '../roles.mapper';
import { RoleOrmEntity } from './role.orm-entity';
import type { FindRolesParams, RoleRepositoryPort } from './role.repository.port';

/**
 * TypeORM-backed adapter for the role aggregate. Translates between the domain
 * `RoleEntity` and the `RoleOrmEntity` persistence model via `RoleMapper` and
 * publishes any collected domain events once a write succeeds.
 */
@Injectable()
export class RoleRepository implements RoleRepositoryPort {
  constructor(
    @InjectRepository(RoleOrmEntity)
    private readonly repository: Repository<RoleOrmEntity>,
    private readonly dataSource: DataSource,
    private readonly mapper: RoleMapper,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async insert(entity: RoleEntity | RoleEntity[]): Promise<void> {
    const entities = Array.isArray(entity) ? entity : [entity];
    const records = entities.map((e) => this.mapper.toPersistence(e));
    // Cast around TypeORM's `QueryDeepPartialEntity` recursion, which can't
    // represent the free-form `permissions` jsonb (Record<string, unknown>).
    await this.repository.insert(records as Parameters<typeof this.repository.insert>[0]);
    await Promise.all(entities.map((e) => this.publishEvents(e)));
  }

  async save(entity: RoleEntity): Promise<RoleEntity> {
    const record = await this.repository.save(this.mapper.toPersistence(entity));
    await this.publishEvents(entity);
    return this.mapper.toDomain(record);
  }

  async findOneById(id: string): Promise<Option<RoleEntity>> {
    const record = await this.repository.findOneBy({ id });
    return record ? Some(this.mapper.toDomain(record)) : None;
  }

  async findOneByName(name: string): Promise<Option<RoleEntity>> {
    const record = await this.repository.findOneBy({ name });
    return record ? Some(this.mapper.toDomain(record)) : None;
  }

  async findByIds(ids: string[]): Promise<RoleEntity[]> {
    if (ids.length === 0) return [];
    const records = await this.repository.findBy({ id: In(ids) });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findAll(): Promise<RoleEntity[]> {
    const records = await this.repository.find();
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findAllPaginated(params: PaginatedQueryParams): Promise<Paginated<RoleEntity>> {
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

  async findRoles(params: FindRolesParams): Promise<Paginated<RoleEntity>> {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const [records, count] = await this.repository.findAndCount({
      where: search ? { name: ILike(`%${search}%`) } : {},
      skip,
      take: limit,
      order: { name: 'ASC' },
    });

    return new Paginated({
      count,
      limit,
      page,
      data: records.map((record) => this.mapper.toDomain(record)),
    });
  }

  async delete(entity: RoleEntity): Promise<boolean> {
    const result = await this.repository.delete({
      id: entity.id as AggregateID,
    });
    await this.publishEvents(entity);
    return result.affected ? result.affected > 0 : false;
  }

  transaction<T>(handler: () => Promise<T>): Promise<T> {
    return this.dataSource.transaction(() => handler());
  }

  private async publishEvents(entity: RoleEntity): Promise<void> {
    const events = entity.domainEvents;
    if (events.length === 0) return;
    await Promise.all(
      events.map((event) => this.eventEmitter.emitAsync(event.constructor.name, event)),
    );
    entity.clearEvents();
  }
}
