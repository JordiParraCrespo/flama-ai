import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type Repository } from 'typeorm';
import { DomainOrmEntity } from './domain.orm-entity';
import { UserDomainAccessOrmEntity } from './user-domain-access.orm-entity';
import type {
  UserDomainAccessRepositoryPort,
  UserDomainRestriction,
} from './user-domain-access.repository.port';

/**
 * TypeORM-backed adapter for the user↔domain access join.
 *
 * The join carries no `organizationId` of its own — a domain already belongs to
 * exactly one organization, so the organization is derived by joining `domain`
 * rather than denormalized here, where it could drift.
 */
@Injectable()
export class UserDomainAccessRepository implements UserDomainAccessRepositoryPort {
  constructor(
    @InjectRepository(UserDomainAccessOrmEntity)
    private readonly repository: Repository<UserDomainAccessOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findDomainIdsForUser(userId: string, organizationId: string): Promise<string[]> {
    const rows = await this.repository
      .createQueryBuilder('access')
      .innerJoin(DomainOrmEntity, 'domain', 'domain.id = access.domainId')
      .where('access.userId = :userId', { userId })
      .andWhere('domain.organizationId = :organizationId', { organizationId })
      .select('access.domainId', 'domainId')
      .getRawMany<{ domainId: string }>();

    return rows.map((row) => row.domainId);
  }

  async findRestrictionsForUser(userId: string): Promise<UserDomainRestriction[]> {
    const rows = await this.repository
      .createQueryBuilder('access')
      .innerJoin(DomainOrmEntity, 'domain', 'domain.id = access.domainId')
      .where('access.userId = :userId', { userId })
      .select('access.domainId', 'domainId')
      .addSelect('domain.organizationId', 'organizationId')
      .getRawMany<{ domainId: string; organizationId: string }>();

    const byOrganization = new Map<string, string[]>();
    for (const row of rows) {
      const existing = byOrganization.get(row.organizationId);
      if (existing) existing.push(row.domainId);
      else byOrganization.set(row.organizationId, [row.domainId]);
    }

    return [...byOrganization].map(([organizationId, domainIds]) => ({
      organizationId,
      domainIds,
    }));
  }

  /**
   * Replace the user's restriction set within one organization.
   *
   * The delete is joined to `domain` so it only removes rows for domains in
   * that organization — deleting by `userId` alone would wipe the restrictions
   * an admin configured in every *other* organization the user belongs to.
   * Delete and insert run in one transaction so a concurrent read never sees a
   * partially applied set, which would briefly widen or narrow access.
   */
  async replaceForUser(userId: string, organizationId: string, domainIds: string[]): Promise<void> {
    const unique = [...new Set(domainIds)];

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(UserDomainAccessOrmEntity);

      await repo
        .createQueryBuilder()
        .delete()
        .where('userId = :userId', { userId })
        .andWhere(
          'domainId IN (SELECT id FROM "domain" WHERE "organizationId" = :organizationId)',
          { organizationId },
        )
        .execute();

      if (unique.length > 0) {
        await repo.insert(unique.map((domainId) => ({ userId, domainId })));
      }
    });
  }

  async deleteForDomain(domainId: string): Promise<void> {
    await this.repository.delete({ domainId });
  }
}
