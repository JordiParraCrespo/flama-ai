import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@flama/design-system-web';
import { useGenerateBackupCodes } from '@flama/frontend-consumer/react';
import { useCopy, useErrorMessage } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { BackupCodes } from '@/features/profile/components/backup-codes';
import { TwoFactorPasswordForm } from '@/features/profile/forms/two-factor-password-form';

const FORM = 'regenerate-backup-codes';

/**
 * Replaces the backup codes behind the password, then shows the new ones this
 * once. The old ones stop working the moment the new ones exist.
 */
export function RegenerateBackupCodesDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const { copied, copy } = useCopy();
  const generate = useGenerateBackupCodes();
  const codes = generate.data;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('profile.twoFactor.regenerateTitle')}</DialogTitle>
          <DialogDescription>
            {codes
              ? t('profile.twoFactor.enableCodesStep')
              : t('profile.twoFactor.regenerateDescription')}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-4">
            {generate.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {resolveError(generate.error, t('common.error')).message}
                </AlertDescription>
              </Alert>
            )}
            {codes ? (
              <BackupCodes codes={codes} copied={copied} onCopy={() => copy(codes.join('\n'))} />
            ) : (
              <TwoFactorPasswordForm
                id={FORM}
                isPending={generate.isPending}
                onSubmit={({ password }) => generate.mutate(password)}
              />
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          {codes ? (
            <Button type="button" onClick={onClose}>
              {t('profile.twoFactor.done')}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" form={FORM} disabled={generate.isPending}>
                {t('profile.twoFactor.regenerate')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
