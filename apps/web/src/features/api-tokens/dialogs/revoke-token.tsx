import type { ApiTokenEntity } from '@flama/frontend-consumer';
import { useRevokeApiToken } from '@flama/frontend-consumer/react';
import { ConfirmDialog } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';

/**
 * Asks before revoking a token, and owns the revoke.
 *
 * A revoked token cannot be brought back, and whatever was using it stops
 * working at once, so one click in a row menu is not enough. The table keeps
 * which token is being revoked: the menu that opens this unmounts when it
 * closes, so the open state cannot live below it.
 */
export function RevokeTokenDialog({
  token,
  onClose,
}: {
  token: ApiTokenEntity;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const revoke = useRevokeApiToken({ onSuccess: onClose });

  return (
    <ConfirmDialog
      title={t('apiTokens.revokeTitle', { name: token.name })}
      description={t('apiTokens.revokeDescription')}
      confirmLabel={t('apiTokens.revoke')}
      pending={revoke.isPending}
      error={revoke.error}
      onClose={onClose}
      onConfirm={() => revoke.mutate(token.id)}
    />
  );
}
