import { subject } from '@casl/ability';
import { defineAbilitiesFromPermissions } from '@flama/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AbilityContributorRegistry } from '../../roles/services/ability-contributor';
import type { UserDomainAccessRepositoryPort } from '../database/user-domain-access.repository.port';
import { DomainAccessContributor } from '../services/domain-access.contributor';

describe('DomainAccessContributor', () => {
  let repository: UserDomainAccessRepositoryPort;
  let contributor: DomainAccessContributor;

  beforeEach(() => {
    repository = {
      findDomainIdsForUser: vi.fn().mockResolvedValue([]),
      replaceForUser: vi.fn(),
      deleteForDomain: vi.fn(),
    };
    contributor = new DomainAccessContributor(repository, new AbilityContributorRegistry());
  });

  it('contributes nothing for a user with no recorded restriction', async () => {
    vi.mocked(repository.findDomainIdsForUser).mockResolvedValue([]);

    expect(await contributor.contribute({ id: 'user-1' }, {})).toEqual([]);
  });

  it('contributes nothing for an unauthenticated principal', async () => {
    expect(await contributor.contribute({}, {})).toEqual([]);
    expect(repository.findDomainIdsForUser).not.toHaveBeenCalled();
  });

  it('emits only inverted rules, so it can never widen access', async () => {
    vi.mocked(repository.findDomainIdsForUser).mockResolvedValue(['d1']);

    const rules = await contributor.contribute({ id: 'user-1' }, {});

    expect(rules).not.toHaveLength(0);
    expect(rules.every((rule) => rule.inverted === true)).toBe(true);
  });

  it('registers itself with the registry on init', () => {
    const registry = new AbilityContributorRegistry();
    const self = new DomainAccessContributor(repository, registry);

    self.onModuleInit();

    expect(registry.all()).toContain(self);
  });

  describe('the resulting ability', () => {
    async function abilityFor(allowedDomainIds: string[]) {
      vi.mocked(repository.findDomainIdsForUser).mockResolvedValue(allowedDomainIds);
      const restrictions = await contributor.contribute({ id: 'user-1' }, {});
      // Role grants workspace-wide Domain access; the contributor narrows it.
      return defineAbilitiesFromPermissions([
        { action: 'manage', subject: 'Domain' },
        ...restrictions,
      ]);
    }

    it('permits a domain inside the allow-list', async () => {
      const ability = await abilityFor(['d1', 'd2']);

      expect(ability.can('read', subject('Domain', { id: 'd1' }))).toBe(true);
      expect(ability.can('update', subject('Domain', { id: 'd2' }))).toBe(true);
    });

    it('denies a domain outside the allow-list', async () => {
      const ability = await abilityFor(['d1', 'd2']);

      expect(ability.can('read', subject('Domain', { id: 'd3' }))).toBe(false);
      expect(ability.can('delete', subject('Domain', { id: 'd3' }))).toBe(false);
    });

    it('leaves other subjects untouched', async () => {
      vi.mocked(repository.findDomainIdsForUser).mockResolvedValue(['d1']);
      const restrictions = await contributor.contribute({ id: 'user-1' }, {});
      const ability = defineAbilitiesFromPermissions([
        { action: 'read', subject: 'User' },
        ...restrictions,
      ]);

      expect(ability.can('read', 'User')).toBe(true);
    });
  });
});

describe('AbilityContributorRegistry', () => {
  it('does not register the same contributor twice', () => {
    const registry = new AbilityContributorRegistry();
    const contributor = { contribute: vi.fn().mockResolvedValue([]) };

    registry.register(contributor);
    registry.register(contributor);

    expect(registry.all()).toHaveLength(1);
  });
});
