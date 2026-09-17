import type { RoleEntity } from '@flama/frontend-admin';
import { RolePill } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';

/**
 * The roles a user holds, as pills.
 *
 * Each user's roles are their own query, so this cell settles on its own — one
 * row filling in does not redraw the rest of the table.
 */
export function UserRolesCell({ roles }: { roles: RoleEntity[] }) {
  const { t } = useTranslation();

  if (roles.length === 0) return <span className="text-ink-400">{t('control.users.noRoles')}</span>;

  return (
    <span className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <RolePill key={role.id} role={role.name} />
      ))}
    </span>
  );
}
