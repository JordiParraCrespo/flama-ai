import { type AggregateID, Paginated, type PaginatedQueryParams } from '@flama/backend-ddd';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { None, type Option, Some } from 'oxide.ts';
import { DataSource, type FindOptionsWhere, ILike, type Repository } from 'typeorm';
import type { UserEntity } from '../domain/user.entity';
import { UserMapper } from '../user.mapper';
import { UserOrmEntity } from './user.orm-entity';
import type { FindUsersParams, UserRepositoryPort } from './user.repository.port';

/**
 * TypeORM-backed adapter for the user aggregate. Translates between the domain
 * `UserEntity` and the `UserOrmEntity` persistence model via `UserMapper`, and
 * publishes any domain events the aggregate collected once a write succeeds.
 */
@Injectable()
export class UserRepository implements UserRepositoryPort {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repository: Repository<UserOrmEntity>,
    private readonly dataSource: DataSource,
    private readonly mapper: UserMapper,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async insert(entity: UserEntity | UserEntity[]): Promise<void> {
    const entities = Array.isArray(entity) ? entity : [entity];
    const records = entities.map((e) => this.mapper.toPersistence(e));
    await this.repository.insert(records);
    await Promise.all(entities.map((e) => this.publishEvents(e)));
  }

  async save(entity: UserEntity): Promise<UserEntity> {
    // Only profile columns are written (see UserMapper.toPersistence); `name`
    // and `image` stay under Better Auth's control.
    const record = await this.repository.save(this.mapper.toPersistence(entity));
    await this.publishEvents(entity);
    return this.mapper.toDomain(record);
  }

  async findOneById(id: string): Promise<Option<UserEntity>> {
    const record = await this.repository.findOneBy({ id });
    return record ? Some(this.mapper.toDomain(record)) : None;
  }

  async findOneByEmail(email: string): Promise<Option<UserEntity>> {
    const record = await this.repository.findOneBy({ email });
    return record ? Some(this.mapper.toDomain(record)) : None;
  }

  async findAll(): Promise<UserEntity[]> {
    const records = await this.repository.find();
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findAllPaginated(params: PaginatedQueryParams): Promise<Paginated<UserEntity>> {
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

  async findUsers(params: FindUsersParams): Promise<Paginated<UserEntity>> {
    const { page, limit, role, search } = params;
    const skip = (page - 1) * limit;

    const baseWhere: FindOptionsWhere<UserOrmEntity> = {};
    if (role) baseWhere.role = role;

    // Search matches name or email; applied as an OR across the columns.
    const where: FindOptionsWhere<UserOrmEntity>[] | FindOptionsWhere<UserOrmEntity> = search
      ? [
          { ...baseWhere, firstName: ILike(`%${search}%`) },
          { ...baseWhere, lastName: ILike(`%${search}%`) },
          { ...baseWhere, email: ILike(`%${search}%`) },
        ]
      : baseWhere;

    const [records, count] = await this.repository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return new Paginated({
      count,
      limit,
      page,
      data: records.map((record) => this.mapper.toDomain(record)),
    });
  }

  async delete(entity: UserEntity): Promise<boolean> {
    const result = await this.repository.delete({
      id: entity.id as AggregateID,
    });
    await this.publishEvents(entity);
    return result.affected ? result.affected > 0 : false;
  }

  transaction<T>(handler: () => Promise<T>): Promise<T> {
    return this.dataSource.transaction(() => handler());
  }

  /**
   * Emits the aggregate's collected domain events through the shared
   * `EventEmitter2` bus (keyed by event class name), then clears them.
   */
  private async publishEvents(entity: UserEntity): Promise<void> {
    const events = entity.domainEvents;
    if (events.length === 0) return;
    await Promise.all(
      events.map((event) => this.eventEmitter.emitAsync(event.constructor.name, event)),
    );
    entity.clearEvents();
  }
}
