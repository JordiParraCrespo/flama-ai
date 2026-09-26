import { useRevokeOtherProfileSessions } from '@flama/frontend-consumer/react';
import { ConfirmDialog } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';

/** Asks before signing every other device out at once, and owns that revoke. */
export function RevokeOtherSessionsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const revokeOthers = useRevokeOtherProfileSessions({ onSuccess: onClose });

  return (
    <ConfirmDialog
      title={t('profile.sessions.revokeOthersTitle')}
      description={t('profile.sessions.revokeOthersDescription')}
      confirmLabel={t('profile.sessions.signOutAll')}
      pending={revokeOthers.isPending}
      error={revokeOthers.error}
      onClose={onClose}
      onConfirm={() => revokeOthers.mutate()}
    />
  );
}
