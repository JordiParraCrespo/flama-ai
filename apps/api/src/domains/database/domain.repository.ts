import {
  type AggregateID,
  OutboxService,
  Paginated,
  type PaginatedQueryParams,
} from '@flama/backend-ddd';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { None, type Option, Some } from 'oxide.ts';
import { DataSource, type FindOptionsWhere, ILike, In, type Repository } from 'typeorm';
import type { DomainEntity } from '../domain/domain.entity';
import { DomainMapper } from '../domain.mapper';
import { DomainOrmEntity } from './domain.orm-entity';
import type { DomainRepositoryPort, FindDomainsParams } from './domain.repository.port';

/**
 * TypeORM-backed adapter for the domain aggregate. Translates between the
 * domain `DomainEntity` and the `DomainOrmEntity` persistence model via
 * `DomainMapper`, and stages the aggregate's domain events on the transactional
 * outbox atomically with the write that raised them.
 */
@Injectable()
export class DomainRepository implements DomainRepositoryPort {
  constructor(
    @InjectRepository(DomainOrmEntity)
    private readonly repository: Repository<DomainOrmEntity>,
    private readonly dataSource: DataSource,
    private readonly mapper: DomainMapper,
    private readonly outbox: OutboxService,
  ) {}

  async insert(entity: DomainEntity | DomainEntity[]): Promise<void> {
    const entities = Array.isArray(entity) ? entity : [entity];
    const records = entities.map((e) => this.mapper.toPersistence(e));
    await this.outbox.writeWithEvents(entities, (manager) =>
      manager.getRepository(DomainOrmEntity).insert(records),
    );
  }

  async save(entity: DomainEntity): Promise<DomainEntity> {
    const record = await this.outbox.writeWithEvents([entity], (manager) =>
      manager.getRepository(DomainOrmEntity).save(this.mapper.toPersistence(entity)),
    );
    return this.mapper.toDomain(record);
  }

  async findOneById(id: string): Promise<Option<DomainEntity>> {
    const record = await this.repository.findOneBy({ id });
    return record ? Some(this.mapper.toDomain(record)) : None;
  }

  async findOneByHostname(organizationId: string, hostname: string): Promise<Option<DomainEntity>> {
    const record = await this.repository.findOneBy({
      organizationId,
      hostname: hostname.toLowerCase(),
    });
    return record ? Some(this.mapper.toDomain(record)) : None;
  }

  async findByIds(organizationId: string, ids: string[]): Promise<DomainEntity[]> {
    if (ids.length === 0) return [];
    const records = await this.repository.findBy({
      organizationId,
      id: In(ids),
    });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findAll(): Promise<DomainEntity[]> {
    const records = await this.repository.find();
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findAllPaginated(params: PaginatedQueryParams): Promise<Paginated<DomainEntity>> {
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

  async findDomains(params: FindDomainsParams): Promise<Paginated<DomainEntity>> {
    const { organizationId, page, limit, status, ownerId, search, allowedDomainIds } = params;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<DomainOrmEntity> = { organizationId };
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;
    if (search) where.hostname = ILike(`%${search}%`);

    // A caller restricted to specific domains sees only those. An empty
    // allow-list is a real restriction ("no domains"), not an absent one —
    // `undefined` is what means unrestricted.
    if (allowedDomainIds !== undefined) {
      if (allowedDomainIds.length === 0) {
        return new Paginated({ count: 0, limit, page, data: [] });
      }
      where.id = In(allowedDomainIds);
    }

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

  async delete(entity: DomainEntity): Promise<boolean> {
    const result = await this.outbox.writeWithEvents([entity], (manager) =>
      manager.getRepository(DomainOrmEntity).delete({ id: entity.id as AggregateID }),
    );
    return result.affected ? result.affected > 0 : false;
  }

  transaction<T>(handler: () => Promise<T>): Promise<T> {
    return this.dataSource.transaction(() => handler());
  }
}
