import { AppError } from '@flama/backend-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrganizationMembershipRepositoryPort } from '../../../../access-control/database/organization-membership.repository.port';
import type { ResourceAccessRepositoryPort } from '../../../../access-control/database/resource-access.repository.port';
import { ResourceAccessService } from '../../../../access-control/services/resource-access.service';
import type { DomainRepositoryPort } from '../../../database/domain.repository.port';
import { DomainEntity } from '../../../domain/domain.entity';
import { Hostname } from '../../../domain/value-objects/hostname.value-object';
import { SetUserDomainAccessCommand } from '../set-user-domain-access.command';
import { SetUserDomainAccessService } from '../set-user-domain-access.service';

const ORG = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';

function domainWithId(id: string): DomainEntity {
  return DomainEntity.create({
    id,
    props: {
      organizationId: ORG,
      hostname: Hostname.of('example.com'),
      protocol: 'https',
      status: 'draft',
      ownerId: null,
      importSearchConsole: true,
      runInitialCrawl: true,
      verifiedAt: null,
      lastCrawledAt: null,
    },
  });
}

describe('SetUserDomainAccessService', () => {
  let accessRepository: ResourceAccessRepositoryPort;
  let resourceAccess: ResourceAccessService;
  let domains: Pick<DomainRepositoryPort, 'findByIds'>;
  let membership: OrganizationMembershipRepositoryPort;
  let service: SetUserDomainAccessService;

  beforeEach(() => {
    accessRepository = {
      findAllowedIds: vi.fn().mockResolvedValue([]),
      findRestrictionsForUser: vi.fn().mockResolvedValue([]),
      replaceForUser: vi.fn(),
      deleteForResource: vi.fn(),
    };
    resourceAccess = new ResourceAccessService(accessRepository);
    domains = { findByIds: vi.fn().mockResolvedValue([]) };
    membership = { isMember: vi.fn().mockResolvedValue(true) };
    service = new SetUserDomainAccessService(
      resourceAccess,
      domains as DomainRepositoryPort,
      membership,
    );
  });

  function run(domainIds: string[] = []) {
    return service.execute(
      new SetUserDomainAccessCommand({
        userId: USER,
        organizationId: ORG,
        domainIds,
      }),
    );
  }

  it('refuses a target user who is not a member of the organization', async () => {
    vi.mocked(membership.isMember).mockResolvedValue(false);

    await expect(run(['d1'])).rejects.toBeInstanceOf(AppError);
    expect(accessRepository.replaceForUser).not.toHaveBeenCalled();
  });

  it('checks membership before touching the join, even when clearing access', async () => {
    vi.mocked(membership.isMember).mockResolvedValue(false);

    await expect(run([])).rejects.toBeInstanceOf(AppError);
    expect(accessRepository.replaceForUser).not.toHaveBeenCalled();
  });

  it('refuses domain ids that do not belong to the organization', async () => {
    vi.mocked(domains.findByIds).mockResolvedValue([domainWithId('d1')]);

    await expect(run(['d1', 'd-other-tenant'])).rejects.toBeInstanceOf(AppError);
    expect(accessRepository.replaceForUser).not.toHaveBeenCalled();
  });

  it('replaces the set scoped to the organization', async () => {
    vi.mocked(domains.findByIds).mockResolvedValue([domainWithId('d1'), domainWithId('d2')]);

    await run(['d1', 'd2', 'd1']);

    // Deduplicated, and the organization is passed so other organizations'
    // restrictions survive.
    expect(accessRepository.replaceForUser).toHaveBeenCalledWith(USER, ORG, 'domain', ['d1', 'd2']);
  });

  it('clears the restriction with an empty list', async () => {
    await run([]);

    expect(accessRepository.replaceForUser).toHaveBeenCalledWith(USER, ORG, 'domain', []);
    expect(domains.findByIds).not.toHaveBeenCalled();
  });
});
