import type { UserSessionEntity } from '@flama/frontend-consumer';
import { useRevokeProfileSession } from '@flama/frontend-consumer/react';
import { ConfirmDialog } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';

/**
 * Asks before signing a device out, and owns the revoke — so its pending state
 * is this one session's, not the whole list's.
 */
export function RevokeSessionDialog({
  session,
  onClose,
}: {
  session: UserSessionEntity;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const revoke = useRevokeProfileSession({ onSuccess: onClose });

  return (
    <ConfirmDialog
      title={t('profile.sessions.revokeTitle', {
        device: session.deviceLabel ?? t('profile.sessions.unknownDevice'),
      })}
      description={t('profile.sessions.revokeDescription')}
      confirmLabel={t('profile.sessions.signOut')}
      pending={revoke.isPending}
      error={revoke.error}
      onClose={onClose}
      onConfirm={() => revoke.mutate(session.id)}
    />
  );
}
