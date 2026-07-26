import { subject } from '@casl/ability';
import { describe, expect, it } from 'vitest';
import {
  type AbilityContext,
  defineAbilitiesFor,
  defineAbilitiesFromPermissions,
  KNOWN_ACTIONS,
  KNOWN_SUBJECTS,
  type PermissionDefinition,
  SYSTEM_ROLE_PERMISSIONS,
} from './index';

describe('defineAbilitiesFromPermissions', () => {
  it('grants a simple action/subject permission', () => {
    const ability = defineAbilitiesFromPermissions([{ action: 'read', subject: 'Article' }]);

    expect(ability.can('read', 'Article')).toBe(true);
    expect(ability.can('update', 'Article')).toBe(false);
    expect(ability.can('read', 'User')).toBe(false);
  });

  it('builds an empty ability that denies everything when given no permissions', () => {
    const ability = defineAbilitiesFromPermissions([]);

    expect(ability.can('read', 'Article')).toBe(false);
    expect(ability.can('manage', 'all')).toBe(false);
  });

  it('unions multiple permissions (as when merging several roles)', () => {
    const ability = defineAbilitiesFromPermissions([
      { action: 'read', subject: 'User' },
      { action: 'create', subject: 'Article' },
    ]);

    expect(ability.can('read', 'User')).toBe(true);
    expect(ability.can('create', 'Article')).toBe(true);
    expect(ability.can('delete', 'User')).toBe(false);
  });

  it('supports the `manage`/`all` wildcards for full access', () => {
    const ability = defineAbilitiesFromPermissions([{ action: 'manage', subject: 'all' }]);

    expect(ability.can('read', 'Article')).toBe(true);
    expect(ability.can('delete', 'Role')).toBe(true);
    expect(ability.can('update', 'AnythingCustom')).toBe(true);
  });

  it('honours `inverted` permissions as CASL `cannot` rules', () => {
    const ability = defineAbilitiesFromPermissions([
      { action: 'manage', subject: 'all' },
      { action: 'delete', subject: 'User', inverted: true },
    ]);

    expect(ability.can('update', 'User')).toBe(true);
    expect(ability.can('delete', 'User')).toBe(false);
  });

  it('restricts a permission to specific `fields`', () => {
    const ability = defineAbilitiesFromPermissions([
      { action: 'update', subject: 'User', fields: ['name'] },
    ]);

    expect(ability.can('update', 'User', 'name')).toBe(true);
    expect(ability.can('update', 'User', 'email')).toBe(false);
  });

  describe('condition interpolation', () => {
    it('interpolates the user.id placeholder for own-resource scoping', () => {
      const context: AbilityContext = { user: { id: 'user-1' } };
      const ability = defineAbilitiesFromPermissions(
        [
          {
            action: 'update',
            subject: 'Article',
            // biome-ignore lint/suspicious/noTemplateCurlyInString: literal placeholder interpolated at runtime
            conditions: { authorId: '${user.id}' },
          },
        ],
        context,
      );

      expect(ability.can('update', subject('Article', { authorId: 'user-1' }))).toBe(true);
      expect(ability.can('update', subject('Article', { authorId: 'user-2' }))).toBe(false);
    });

    it('interpolates the activeOrganizationId placeholder for tenant scoping', () => {
      const context: AbilityContext = { activeOrganizationId: 'org-1' };
      const ability = defineAbilitiesFromPermissions(
        [
          {
            action: 'read',
            subject: 'Article',
            // biome-ignore lint/suspicious/noTemplateCurlyInString: literal placeholder interpolated at runtime
            conditions: { organizationId: '${activeOrganizationId}' },
          },
        ],
        context,
      );

      expect(ability.can('read', subject('Article', { organizationId: 'org-1' }))).toBe(true);
      expect(ability.can('read', subject('Article', { organizationId: 'org-2' }))).toBe(false);
    });

    it('resolves a placeholder whose context value is missing to `undefined`', () => {
      const ability = defineAbilitiesFromPermissions(
        [
          {
            action: 'update',
            subject: 'Article',
            // biome-ignore lint/suspicious/noTemplateCurlyInString: literal placeholder interpolated at runtime
            conditions: { authorId: '${user.id}' },
          },
        ],
        {},
      );

      // The placeholder resolves to `undefined`, so only articles with an
      // `undefined` authorId match — a concrete owner never does.
      expect(ability.can('update', subject('Article', { authorId: 'user-1' }))).toBe(false);
    });

    it('passes non-placeholder condition values through untouched', () => {
      const ability = defineAbilitiesFromPermissions([
        { action: 'read', subject: 'Article', conditions: { published: true } },
      ]);

      expect(ability.can('read', subject('Article', { published: true }))).toBe(true);
      expect(ability.can('read', subject('Article', { published: false }))).toBe(false);
    });

    it('interpolates placeholders nested inside arrays and objects', () => {
      const context: AbilityContext = { user: { id: 'user-1' } };
      const ability = defineAbilitiesFromPermissions(
        [
          {
            action: 'read',
            subject: 'Article',
            // biome-ignore lint/suspicious/noTemplateCurlyInString: literal placeholder interpolated at runtime
            conditions: { authorId: { $in: ['${user.id}', 'static-id'] } },
          },
        ],
        context,
      );

      expect(ability.can('read', subject('Article', { authorId: 'user-1' }))).toBe(true);
      expect(ability.can('read', subject('Article', { authorId: 'static-id' }))).toBe(true);
      expect(ability.can('read', subject('Article', { authorId: 'user-2' }))).toBe(false);
    });
  });
});

describe('defineAbilitiesFor (legacy single-role helper)', () => {
  it('builds the admin ability with full access', () => {
    const ability = defineAbilitiesFor('admin');

    expect(ability.can('manage', 'all')).toBe(true);
    expect(ability.can('delete', 'User')).toBe(true);
  });

  it('builds the seeded `user` ability with limited access', () => {
    const ability = defineAbilitiesFor('user');

    expect(ability.can('read', 'User')).toBe(true);
    expect(ability.can('update', 'User')).toBe(true);
    expect(ability.can('read', 'Article')).toBe(true);
    expect(ability.can('create', 'Article')).toBe(true);
    expect(ability.can('delete', 'Article')).toBe(false);
    expect(ability.can('manage', 'all')).toBe(false);
  });

  it('returns an empty (deny-all) ability for an unknown role', () => {
    const ability = defineAbilitiesFor('does-not-exist');

    expect(ability.can('read', 'User')).toBe(false);
    expect(ability.can('manage', 'all')).toBe(false);
  });

  it('forwards the context so scoped fallback permissions still interpolate', () => {
    // The seeded `user` role has no conditions, so this mainly asserts the
    // context threads through without breaking a known role.
    const ability = defineAbilitiesFor('user', { user: { id: 'user-1' } });
    expect(ability.can('read', 'User')).toBe(true);
  });
});

describe('SYSTEM_ROLE_PERMISSIONS', () => {
  it('grants superadmin and admin `manage all`', () => {
    for (const role of ['superadmin', 'admin'] as const) {
      const perms = SYSTEM_ROLE_PERMISSIONS[role] satisfies PermissionDefinition[];
      const ability = defineAbilitiesFromPermissions(perms);
      expect(ability.can('manage', 'all')).toBe(true);
    }
  });

  it('does not grant the `user` role destructive access', () => {
    const ability = defineAbilitiesFromPermissions(SYSTEM_ROLE_PERMISSIONS.user);
    expect(ability.can('delete', 'User')).toBe(false);
    expect(ability.can('manage', 'all')).toBe(false);
  });
});

describe('known catalogs', () => {
  it('exposes the built-in actions and subjects for seeding/UI', () => {
    expect(KNOWN_ACTIONS).toContain('manage');
    expect(KNOWN_SUBJECTS).toContain('all');
    expect(KNOWN_SUBJECTS).toContain('Organization');
    expect(KNOWN_SUBJECTS).toContain('Workspace');
  });
});
