import { Alert, AlertDescription, Badge, Button, Switch, toast } from '@flama/design-system-web';
import { ShieldCheck } from '@flama/design-system-web/icons';
import type { ProfileEntity } from '@flama/frontend-consumer';
import { useChangeOwnPassword } from '@flama/frontend-consumer/react';
import {
  RowControl,
  RowMedia,
  RowMeta,
  SectionCard,
  SectionHead,
  SectionRow,
  useErrorMessage,
} from '@flama/frontend-web';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DisableTwoFactorDialog } from '@/features/profile/dialogs/disable-two-factor';
import { EnableTwoFactorDialog } from '@/features/profile/dialogs/enable-two-factor';
import { RegenerateBackupCodesDialog } from '@/features/profile/dialogs/regenerate-backup-codes';
import { PasswordForm, type PasswordFormValues } from '@/features/profile/forms/password-form';

type TwoFactorDialog = 'enable' | 'disable' | 'backup-codes';

export function PasswordSection({ profile }: { profile: ProfileEntity }) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const change = useChangeOwnPassword();
  const [dialog, setDialog] = useState<TwoFactorDialog | null>(null);
  const closeDialog = () => setDialog(null);

  const onSubmit = async (values: PasswordFormValues) => {
    await change.mutateAsync({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      // The usual reason to change a password is that somebody else may know
      // the old one; leaving their session alive would make this pointless.
      revokeOtherSessions: true,
    });
    toast.success(t('toasts.passwordChanged'));
  };

  return (
    <>
      <SectionHead title={t('profile.password.title')} sub={t('profile.password.description')} />

      {change.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{resolveError(change.error).message}</AlertDescription>
        </Alert>
      )}

      <PasswordForm isPending={change.isPending} onSubmit={onSubmit} />

      <SectionCard>
        <SectionRow>
          <RowMedia>
            <ShieldCheck className="size-[17px] text-ink-600" />
          </RowMedia>
          <RowMeta
            name={t('profile.password.twoFactor')}
            description={t('profile.password.twoFactorDescription')}
          />
          <RowControl>
            {profile.twoFactorEnabled && (
              <>
                <Badge variant="active">{t('profile.password.twoFactorOn')}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDialog('backup-codes')}
                >
                  {t('profile.twoFactor.regenerate')}
                </Button>
              </>
            )}
            {/* The switch opens the dialog that does the work rather than
                flipping anything itself: both directions ask for the password,
                and turning it on needs the app scanned first. */}
            <Switch
              checked={profile.twoFactorEnabled}
              onCheckedChange={() => setDialog(profile.twoFactorEnabled ? 'disable' : 'enable')}
              aria-label={t('profile.password.twoFactor')}
            />
          </RowControl>
        </SectionRow>
      </SectionCard>

      {dialog === 'enable' && <EnableTwoFactorDialog onClose={closeDialog} />}
      {dialog === 'disable' && <DisableTwoFactorDialog onClose={closeDialog} />}
      {dialog === 'backup-codes' && <RegenerateBackupCodesDialog onClose={closeDialog} />}
    </>
  );
}
