import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogHero,
  DialogHeroPlate,
  DialogTitle,
} from '@flama/design-system-web';
import { Shield } from '@flama/design-system-web/icons';
import type { AdminUserEntity, RoleEntity } from '@flama/frontend-admin';
import { useAssignAdminUserRoles, useRoles } from '@flama/frontend-admin/react';
import { useTranslation } from 'react-i18next';
import { AssignRolesForm } from '@/features/admin-users/forms/assign-roles-form';

/**
 * Assign a user's roles.
 *
 * The list of roles to pick from is asked for here, when the dialog opens,
 * rather than kept warm by the screen behind it: nothing else on that screen
 * renders it, and while it lived up there every settle of it went through the
 * table. The reader's current roles still come in as a prop — the table already
 * has them, one query per row, to draw the pills.
 */
export function AssignRolesDialog({
  user,
  assignedRoles,
  onClose,
}: {
  user: AdminUserEntity;
  assignedRoles: RoleEntity[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const roles = useRoles({ page: 1, limit: 100 });
  const assign = useAssignAdminUserRoles();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHero gradient="tealGreen">
          <DialogHeroPlate>
            <Shield />
          </DialogHeroPlate>
        </DialogHero>
        <DialogHeader>
          <DialogTitle>{t('control.users.roles.title')}</DialogTitle>
          <DialogDescription>
            {t('control.users.roles.description', { name: user.name })}
          </DialogDescription>
        </DialogHeader>
        <AssignRolesForm
          roles={roles.data?.data ?? []}
          assignedRoles={assignedRoles}
          isPending={assign.isPending}
          error={assign.error}
          onCancel={onClose}
          onSubmit={async ({ roleIds }) => {
            try {
              await assign.mutateAsync({ userId: user.id, roleIds });
              onClose();
            } catch {
              // The request error stays visible in the dialog.
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
