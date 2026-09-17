import { Badge } from '@flama/design-system-web';
import type { AdminUserEntity, RoleEntity } from '@flama/frontend-admin';
import { type DataTableColumn, formatMediumDate, useLocale } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { UserCell } from '@/features/admin-users/components/user-cell';
import { UserRolesCell } from '@/features/admin-users/components/user-roles-cell';

/** The users table's columns: who, what they may do, and since when. */
export function useUserColumns(
  assignedRoles: Map<string, RoleEntity[]>,
): DataTableColumn<AdminUserEntity>[] {
  const { t } = useTranslation();
  const locale = useLocale();

  return [
    {
      key: 'name',
      label: t('control.users.columns.name'),
      sortKey: 'name',
      width: 250,
      render: (user) => <UserCell user={user} />,
    },
    {
      key: 'roles',
      label: t('control.users.columns.roles'),
      width: 220,
      render: (user) => <UserRolesCell roles={assignedRoles.get(user.id) ?? []} />,
    },
    {
      key: 'access',
      label: t('control.users.columns.access'),
      width: 150,
      render: (user) => (
        <Badge variant={user.isSuperAdmin ? 'default' : 'neutral'}>
          {user.isSuperAdmin ? t('control.users.superAdmin') : t('control.users.consumer')}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: t('control.users.columns.status'),
      width: 120,
      render: (user) => (
        <Badge variant={user.banned ? 'destructive' : 'active'}>
          {t(user.banned ? 'control.users.banned' : 'control.users.active')}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: t('control.users.columns.joined'),
      sortKey: 'createdAt',
      width: 150,
      render: (user) => (
        <span className="text-ink-600">{formatMediumDate(user.createdAt, locale)}</span>
      ),
    },
  ];
}
