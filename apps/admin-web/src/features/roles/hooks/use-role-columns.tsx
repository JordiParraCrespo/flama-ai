import type { RoleEntity } from '@flama/frontend-admin';
import type { DataTableColumn } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { RoleCell } from '@/features/roles/components/role-cell';
import { RoleTypeBadge } from '@/features/roles/components/role-type-badge';

/**
 * The roles table's columns.
 *
 * A hook rather than a constant because every label is a `t()` call, and a hook
 * rather than a block inside the section because the section is a composition:
 * what a column looks like is a separate question from which page is on screen.
 *
 * The member count is only a column when somebody counted — the roles screen
 * shows the list on its own, the team tab shows it beside its members.
 */
export function useRoleColumns(roleCounts?: Map<string, number>): DataTableColumn<RoleEntity>[] {
  const { t } = useTranslation();

  return [
    {
      key: 'role',
      label: t('pages.team.roles.columns.role'),
      width: 380,
      render: (role) => <RoleCell role={role} />,
    },
    ...(roleCounts
      ? [
          {
            key: 'members',
            label: t('pages.team.roles.columns.members'),
            width: 140,
            render: (role: RoleEntity) => (
              <span className="text-ink-600">
                {t('pages.team.roles.memberCount', { count: roleCounts.get(role.id) ?? 0 })}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'type',
      label: t('pages.team.roles.columns.type'),
      width: 120,
      render: (role) => <RoleTypeBadge isSystem={role.isSystem} />,
    },
  ];
}
