import { subject } from '@casl/ability';
import { defineAbilitiesFromPermissions } from '@flama/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AbilityContributorRegistry } from '../../roles/services/ability-contributor';
import type { UserDomainAccessRepositoryPort } from '../database/user-domain-access.repository.port';
import { DomainAccessContributor } from '../services/domain-access.contributor';

const ORG_A = 'org-a';
const ORG_B = 'org-b';

describe('DomainAccessContributor', () => {
  let repository: UserDomainAccessRepositoryPort;
  let contributor: DomainAccessContributor;

  beforeEach(() => {
    repository = {
      findDomainIdsForUser: vi.fn().mockResolvedValue([]),
      findRestrictionsForUser: vi.fn().mockResolvedValue([]),
      replaceForUser: vi.fn(),
      deleteForDomain: vi.fn(),
    };
    contributor = new DomainAccessContributor(repository, new AbilityContributorRegistry());
  });

  it('contributes nothing for a user with no recorded restriction', async () => {
    expect(await contributor.contribute({ id: 'user-1' }, {})).toEqual([]);
  });

  it('contributes nothing for an unauthenticated principal', async () => {
    expect(await contributor.contribute({}, {})).toEqual([]);
    expect(repository.findRestrictionsForUser).not.toHaveBeenCalled();
  });

  it('emits only inverted rules, so it can never widen access', async () => {
    vi.mocked(repository.findRestrictionsForUser).mockResolvedValue([
      { organizationId: ORG_A, domainIds: ['d1'] },
    ]);

    const rules = await contributor.contribute({ id: 'user-1' }, {});

    expect(rules).not.toHaveLength(0);
    expect(rules.every((rule) => rule.inverted === true)).toBe(true);
  });

  it('qualifies every rule by organization', async () => {
    vi.mocked(repository.findRestrictionsForUser).mockResolvedValue([
      { organizationId: ORG_A, domainIds: ['d1'] },
    ]);

    const [rule] = await contributor.contribute({ id: 'user-1' }, {});

    expect(rule.conditions).toMatchObject({ organizationId: ORG_A });
  });

  it('registers itself with the registry on init', () => {
    const registry = new AbilityContributorRegistry();
    const self = new DomainAccessContributor(repository, registry);

    self.onModuleInit();

    expect(registry.all()).toContain(self);
  });

  describe('the resulting ability', () => {
    async function abilityFor(
      restrictions: Array<{ organizationId: string; domainIds: string[] }>,
    ) {
      vi.mocked(repository.findRestrictionsForUser).mockResolvedValue(restrictions);
      const contributed = await contributor.contribute({ id: 'user-1' }, {});
      // Role grants workspace-wide Domain access; the contributor narrows it.
      return defineAbilitiesFromPermissions([
        { action: 'manage', subject: 'Domain' },
        ...contributed,
      ]);
    }

    const domain = (id: string, organizationId: string) =>
      subject('Domain', { id, organizationId });

    it('permits a domain inside the allow-list', async () => {
      const ability = await abilityFor([{ organizationId: ORG_A, domainIds: ['d1', 'd2'] }]);

      expect(ability.can('read', domain('d1', ORG_A))).toBe(true);
      expect(ability.can('update', domain('d2', ORG_A))).toBe(true);
    });

    it('denies a domain outside the allow-list', async () => {
      const ability = await abilityFor([{ organizationId: ORG_A, domainIds: ['d1', 'd2'] }]);

      expect(ability.can('read', domain('d3', ORG_A))).toBe(false);
      expect(ability.can('delete', domain('d3', ORG_A))).toBe(false);
    });

    it('leaves an organization the user is unrestricted in fully accessible', async () => {
      // The regression this guards: a single unqualified rule built from org A's
      // allow-list would deny every domain in org B, where nothing is recorded.
      const ability = await abilityFor([{ organizationId: ORG_A, domainIds: ['d1'] }]);

      expect(ability.can('read', domain('b-anything', ORG_B))).toBe(true);
      expect(ability.can('delete', domain('b-anything', ORG_B))).toBe(true);
    });

    it('applies each organization’s restriction independently', async () => {
      const ability = await abilityFor([
        { organizationId: ORG_A, domainIds: ['a1'] },
        { organizationId: ORG_B, domainIds: ['b1'] },
      ]);

      expect(ability.can('read', domain('a1', ORG_A))).toBe(true);
      expect(ability.can('read', domain('b1', ORG_A))).toBe(false);
      expect(ability.can('read', domain('b1', ORG_B))).toBe(true);
      expect(ability.can('read', domain('a1', ORG_B))).toBe(false);
    });

    it('leaves other subjects untouched', async () => {
      vi.mocked(repository.findRestrictionsForUser).mockResolvedValue([
        { organizationId: ORG_A, domainIds: ['d1'] },
      ]);
      const contributed = await contributor.contribute({ id: 'user-1' }, {});
      const ability = defineAbilitiesFromPermissions([
        { action: 'read', subject: 'User' },
        ...contributed,
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
