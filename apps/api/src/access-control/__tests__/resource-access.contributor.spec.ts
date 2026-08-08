import { defineAbilitiesFromPermissions, subject } from '@flama/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AbilityContributorRegistry } from '../../roles/services/ability-contributor';
import type {
  ResourceAccessRepositoryPort,
  ResourceRestriction,
} from '../database/resource-access.repository.port';
import { ResourceAccessContributor } from '../services/resource-access.contributor';
import { RestrictableResourceRegistry } from '../services/restrictable-resource.registry';

const ORG_A = 'org-a';
const ORG_B = 'org-b';

/** A domain-shaped resource, and one whose restriction cascades to a child subject. */
const DOMAIN = {
  type: 'domain',
  scopedSubjects: [
    { subject: 'Domain', field: 'id' },
    { subject: 'Lead', field: 'domainId' },
  ],
};

describe('ResourceAccessContributor', () => {
  let repository: ResourceAccessRepositoryPort;
  let resources: RestrictableResourceRegistry;
  let contributor: ResourceAccessContributor;

  beforeEach(() => {
    repository = {
      findAllowedIds: vi.fn().mockResolvedValue([]),
      findRestrictionsForUser: vi.fn().mockResolvedValue([]),
      replaceForUser: vi.fn(),
      deleteForResource: vi.fn(),
    };
    resources = new RestrictableResourceRegistry();
    resources.register(DOMAIN);
    contributor = new ResourceAccessContributor(
      repository,
      resources,
      new AbilityContributorRegistry(),
    );
  });

  function withRestrictions(...restrictions: ResourceRestriction[]) {
    vi.mocked(repository.findRestrictionsForUser).mockResolvedValue(restrictions);
  }

  it('contributes nothing for a user with no recorded restriction', async () => {
    expect(await contributor.contribute({ id: 'user-1' }, {})).toEqual([]);
  });

  it('contributes nothing for an unauthenticated principal', async () => {
    expect(await contributor.contribute({}, {})).toEqual([]);
    expect(repository.findRestrictionsForUser).not.toHaveBeenCalled();
  });

  it('emits only inverted rules, so it can never widen access', async () => {
    withRestrictions({
      organizationId: ORG_A,
      resourceType: 'domain',
      resourceIds: ['d1'],
    });

    const rules = await contributor.contribute({ id: 'user-1' }, {});

    expect(rules).not.toHaveLength(0);
    expect(rules.every((rule) => rule.inverted === true)).toBe(true);
  });

  it('skips a resource type no module registered', async () => {
    withRestrictions({
      organizationId: ORG_A,
      resourceType: 'campaign',
      resourceIds: ['c1'],
    });

    expect(await contributor.contribute({ id: 'user-1' }, {})).toEqual([]);
  });

  it('registers itself as an ability contributor on init', () => {
    const abilityContributors = new AbilityContributorRegistry();
    const self = new ResourceAccessContributor(repository, resources, abilityContributors);

    self.onModuleInit();

    expect(abilityContributors.all()).toContain(self);
  });

  describe('the resulting ability', () => {
    async function abilityFor(...restrictions: ResourceRestriction[]) {
      withRestrictions(...restrictions);
      const contributed = await contributor.contribute({ id: 'user-1' }, {});
      // Role grants workspace-wide access; the contributor narrows it.
      return defineAbilitiesFromPermissions([
        { action: 'manage', subject: 'Domain' },
        { action: 'manage', subject: 'Lead' },
        ...contributed,
      ]);
    }

    const domain = (id: string, organizationId: string) =>
      subject('Domain', { id, organizationId });
    const lead = (domainId: string, organizationId: string) =>
      subject('Lead', { id: 'lead-1', domainId, organizationId });

    it('permits an instance inside the allow-list', async () => {
      const ability = await abilityFor({
        organizationId: ORG_A,
        resourceType: 'domain',
        resourceIds: ['d1', 'd2'],
      });

      expect(ability.can('read', domain('d1', ORG_A))).toBe(true);
      expect(ability.can('update', domain('d2', ORG_A))).toBe(true);
    });

    it('denies an instance outside the allow-list', async () => {
      const ability = await abilityFor({
        organizationId: ORG_A,
        resourceType: 'domain',
        resourceIds: ['d1'],
      });

      expect(ability.can('read', domain('d2', ORG_A))).toBe(false);
      expect(ability.can('delete', domain('d2', ORG_A))).toBe(false);
    });

    it('cascades the restriction to every scoped subject', async () => {
      // The reason `scopedSubjects` is a list: restricting someone to one domain
      // must also keep them out of the other domains' leads.
      const ability = await abilityFor({
        organizationId: ORG_A,
        resourceType: 'domain',
        resourceIds: ['d1'],
      });

      expect(ability.can('read', lead('d1', ORG_A))).toBe(true);
      expect(ability.can('read', lead('d2', ORG_A))).toBe(false);
    });

    it('leaves an organization the user is unrestricted in fully accessible', async () => {
      // The regression this guards: an unqualified rule built from org A's
      // allow-list would deny every instance in org B, where nothing is recorded.
      const ability = await abilityFor({
        organizationId: ORG_A,
        resourceType: 'domain',
        resourceIds: ['d1'],
      });

      expect(ability.can('read', domain('anything', ORG_B))).toBe(true);
      expect(ability.can('delete', domain('anything', ORG_B))).toBe(true);
    });

    it('applies each organization’s restriction independently', async () => {
      const ability = await abilityFor(
        { organizationId: ORG_A, resourceType: 'domain', resourceIds: ['a1'] },
        { organizationId: ORG_B, resourceType: 'domain', resourceIds: ['b1'] },
      );

      expect(ability.can('read', domain('a1', ORG_A))).toBe(true);
      expect(ability.can('read', domain('b1', ORG_A))).toBe(false);
      expect(ability.can('read', domain('b1', ORG_B))).toBe(true);
      expect(ability.can('read', domain('a1', ORG_B))).toBe(false);
    });

    it('leaves unrelated subjects untouched', async () => {
      withRestrictions({
        organizationId: ORG_A,
        resourceType: 'domain',
        resourceIds: ['d1'],
      });
      const contributed = await contributor.contribute({ id: 'user-1' }, {});
      const ability = defineAbilitiesFromPermissions([
        { action: 'read', subject: 'User' },
        ...contributed,
      ]);

      expect(ability.can('read', 'User')).toBe(true);
    });
  });
});

describe('RestrictableResourceRegistry', () => {
  it('rejects two modules claiming the same resource type', () => {
    const registry = new RestrictableResourceRegistry();
    registry.register({
      type: 'domain',
      scopedSubjects: [{ subject: 'Domain', field: 'id' }],
    });

    expect(() =>
      registry.register({
        type: 'domain',
        scopedSubjects: [{ subject: 'Other', field: 'id' }],
      }),
    ).toThrow(/already registered/);
  });

  it('is idempotent for the same registration', () => {
    const registry = new RestrictableResourceRegistry();

    registry.register(DOMAIN);
    registry.register(DOMAIN);

    expect(registry.get('domain')).toBe(DOMAIN);
  });
});
