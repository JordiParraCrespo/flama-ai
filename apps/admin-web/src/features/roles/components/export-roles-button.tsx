import { Button } from '@flama/design-system-web';
import { Download } from '@flama/design-system-web/icons';
import type { RoleEntity } from '@flama/frontend-admin';
import { TABLE_HEADER_CONTROL_SIZE } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { exportRoles } from '@/features/roles/lib/export-roles';

/**
 * The roles table's one bulk action: download what is ticked.
 *
 * Its own component because the six labels the CSV needs are six `t()` calls,
 * and a table is not improved by carrying them in the middle of its props.
 */
export function ExportRolesButton({
  roles,
  roleCounts,
}: {
  roles: RoleEntity[];
  roleCounts: Map<string, number>;
}) {
  const { t } = useTranslation();

  return (
    <Button
      variant="secondary"
      size={TABLE_HEADER_CONTROL_SIZE}
      onClick={() =>
        exportRoles(roles, roleCounts, {
          role: t('pages.team.roles.columns.role'),
          description: t('pages.team.roles.columns.description'),
          members: t('pages.team.roles.columns.members'),
          type: t('pages.team.roles.columns.type'),
          system: t('pages.team.roles.system'),
          custom: t('pages.team.roles.custom'),
        })
      }
    >
      <Download />
      {t('pages.team.roles.export')}
    </Button>
  );
}
