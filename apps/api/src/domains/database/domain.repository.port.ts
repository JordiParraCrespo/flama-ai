import type { Paginated, RepositoryPort } from '@flama/backend-ddd';
import type { DomainStatus } from '@flama/shared';
import type { Option } from 'oxide.ts';
import type { DomainEntity } from '../domain/domain.entity';

export interface FindDomainsParams {
  organizationId: string;
  page: number;
  limit: number;
  status?: DomainStatus;
  ownerId?: string;
  search?: string;
  /**
   * When set, restricts results to these domain ids — the caller's
   * per-domain access. `undefined` means unrestricted.
   */
  allowedDomainIds?: string[];
}

/**
 * Port for persisting and querying the domain aggregate. Implemented by the
 * TypeORM adapter in `domain.repository.ts`.
 */
export interface DomainRepositoryPort extends RepositoryPort<DomainEntity> {
  findOneByHostname(organizationId: string, hostname: string): Promise<Option<DomainEntity>>;
  findDomains(params: FindDomainsParams): Promise<Paginated<DomainEntity>>;
  /** Used to validate that a set of ids all exist in the organization. */
  findByIds(organizationId: string, ids: string[]): Promise<DomainEntity[]>;
}
