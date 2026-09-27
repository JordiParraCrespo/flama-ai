import { defineAbilitiesFromPermissions, grantableScopes, scopesForPolicy } from '@flama/shared';
import { describe, expect, it } from 'vitest';

/**
 * The admin API's own permission group in the shared scope catalog: privileged
 * user management is a group of its own, apart from the user directory.
 */
describe('the admin scope group', () => {
  it('maps privileged user management to the admin group, not the directory', () => {
    expect(scopesForPolicy({ action: 'manage', subject: 'User' })).toEqual([
      'admin:read',
      'admin:write',
    ]);
  });

  it('does not let a directory reader reach the admin group', () => {
    const ability = defineAbilitiesFromPermissions([{ action: 'read', subject: 'User' }]);
    expect(grantableScopes(ability)).not.toContain('admin:read');
  });
});
