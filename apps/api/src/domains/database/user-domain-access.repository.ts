import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type Repository } from 'typeorm';
import { UserDomainAccessOrmEntity } from './user-domain-access.orm-entity';
import type { UserDomainAccessRepositoryPort } from './user-domain-access.repository.port';

/** TypeORM-backed adapter for the user↔domain access join. */
@Injectable()
export class UserDomainAccessRepository implements UserDomainAccessRepositoryPort {
  constructor(
    @InjectRepository(UserDomainAccessOrmEntity)
    private readonly repository: Repository<UserDomainAccessOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findDomainIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.repository.find({
      where: { userId },
      select: { domainId: true },
    });
    return rows.map((row) => row.domainId);
  }

  /**
   * Replace the user's restriction set. Delete-then-insert inside one
   * transaction so a concurrent read never observes a partially applied
   * set — which would briefly widen or narrow the user's access.
   */
  async replaceForUser(userId: string, domainIds: string[]): Promise<void> {
    const unique = [...new Set(domainIds)];
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(UserDomainAccessOrmEntity);
      await repo.delete({ userId });
      if (unique.length > 0) {
        await repo.insert(unique.map((domainId) => ({ userId, domainId })));
      }
    });
  }

  async deleteForDomain(domainId: string): Promise<void> {
    await this.repository.delete({ domainId });
  }
}
