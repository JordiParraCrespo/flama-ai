import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResourceAccessRepositoryPort } from '../database/resource-access.repository.port';
import { ResourceAccessService } from '../services/resource-access.service';

describe('ResourceAccessService', () => {
  let repository: ResourceAccessRepositoryPort;
  let service: ResourceAccessService;

  beforeEach(() => {
    repository = {
      findAllowedIds: vi.fn().mockResolvedValue([]),
      findRestrictionsForUser: vi.fn().mockResolvedValue([]),
      replaceForUser: vi.fn(),
      deleteForResource: vi.fn(),
    };
    service = new ResourceAccessService(repository);
  });

  describe('allowedIds', () => {
    // The distinction this encodes: an empty array reads as "allowed nothing",
    // which is the opposite of what an absent restriction means.
    it('is undefined — not an empty array — when unrestricted', async () => {
      vi.mocked(repository.findAllowedIds).mockResolvedValue([]);

      expect(await service.allowedIds('u1', 'org-a', 'domain')).toBeUndefined();
    });

    it('is the id list when restricted', async () => {
      vi.mocked(repository.findAllowedIds).mockResolvedValue(['d1', 'd2']);

      expect(await service.allowedIds('u1', 'org-a', 'domain')).toEqual(['d1', 'd2']);
    });

    it('scopes the lookup to the organization and resource type', async () => {
      await service.allowedIds('u1', 'org-a', 'domain');

      expect(repository.findAllowedIds).toHaveBeenCalledWith('u1', 'org-a', 'domain');
    });
  });

  describe('restrictedTo', () => {
    it('reports unrestricted with an empty list', async () => {
      vi.mocked(repository.findAllowedIds).mockResolvedValue([]);

      expect(await service.restrictedTo('u1', 'org-a', 'domain')).toEqual({
        resourceIds: [],
        unrestricted: true,
      });
    });

    it('reports the restriction when one is recorded', async () => {
      vi.mocked(repository.findAllowedIds).mockResolvedValue(['d1']);

      expect(await service.restrictedTo('u1', 'org-a', 'domain')).toEqual({
        resourceIds: ['d1'],
        unrestricted: false,
      });
    });
  });

  it('replaces scoped to one organization and resource type', async () => {
    await service.replace('u1', 'org-a', 'domain', ['d1']);

    expect(repository.replaceForUser).toHaveBeenCalledWith('u1', 'org-a', 'domain', ['d1']);
  });

  it('revokes every grant on a deleted resource', async () => {
    await service.revokeResource('domain', 'd1');

    expect(repository.deleteForResource).toHaveBeenCalledWith('domain', 'd1');
  });
});
