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
  DialogHero,
  DialogHeroPlate,
  DialogTitle,
  toast,
} from '@flama/design-system-web';
import { ShieldCheck } from '@flama/design-system-web/icons';
import { useConfirmTwoFactor, useEnableTwoFactor } from '@flama/frontend-consumer/react';
import { useCopy, useErrorMessage } from '@flama/frontend-web';
import { useTranslation } from 'react-i18next';
import { BackupCodes } from '@/features/profile/components/backup-codes';
import { TotpQrCode } from '@/features/profile/components/totp-qr-code';
import { TwoFactorCodeForm } from '@/features/profile/forms/two-factor-code-form';
import { TwoFactorPasswordForm } from '@/features/profile/forms/two-factor-password-form';
import { groupSecret, totpSecretOf } from '@/features/profile/lib/totp';

const PASSWORD_FORM = 'enable-two-factor-password';
const CODE_FORM = 'enable-two-factor-code';

type Step = 'password' | 'scan' | 'codes';

/** What each step tells the reader, and which form its footer button submits, labelled how. */
const STEPS = {
  password: {
    description: 'profile.twoFactor.enablePasswordStep',
    form: PASSWORD_FORM,
    submit: 'profile.twoFactor.continue',
  },
  scan: {
    description: 'profile.twoFactor.enableScanStep',
    form: CODE_FORM,
    submit: 'profile.twoFactor.verify',
  },
  codes: { description: 'profile.twoFactor.enableCodesStep', form: null, submit: null },
} as const satisfies Record<
  Step,
  { description: string; form: string | null; submit: string | null }
>;

/**
 * The step follows from the two mutations rather than from state of its own:
 * no enrolment yet means the password, an unconfirmed one the QR code, a
 * confirmed one the backup codes.
 */
function stepOf(enrolled: boolean, confirmed: boolean): Step {
  if (!enrolled) return 'password';
  if (!confirmed) return 'scan';
  return 'codes';
}

/**
 * Sets up an authenticator app, in three steps that follow from the two
 * mutations it owns: the password, then the QR code and a first code from
 * the app (which is what turns two-factor on), then the backup codes, shown
 * this once. Closed before the code is confirmed, nothing has changed: the
 * half-made enrolment never asks anyone for a code.
 */
export function EnableTwoFactorDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const resolveError = useErrorMessage();
  const { copied, copy } = useCopy();
  const enable = useEnableTwoFactor();
  const confirm = useConfirmTwoFactor({
    onSuccess: () => toast.success(t('toasts.twoFactorEnabled')),
  });

  const enrolment = enable.data;
  const step = stepOf(Boolean(enrolment), confirm.isSuccess);
  const { description, form, submit } = STEPS[step];
  const error = { password: enable.error, scan: confirm.error, codes: null }[step];
  const secret = enrolment ? totpSecretOf(enrolment.totpURI) : '';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHero gradient="blueLilac">
          <DialogHeroPlate>
            <ShieldCheck />
          </DialogHeroPlate>
        </DialogHero>
        <DialogHeader>
          <DialogTitle>{t('profile.twoFactor.enableTitle')}</DialogTitle>
          <DialogDescription>{t(description)}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {resolveError(error, t('common.error')).message}
                </AlertDescription>
              </Alert>
            )}

            {step === 'password' && (
              <TwoFactorPasswordForm
                id={PASSWORD_FORM}
                isPending={enable.isPending}
                onSubmit={({ password }) => enable.mutate(password)}
              />
            )}

            {step === 'scan' && enrolment && (
              <>
                <div className="flex flex-col items-center gap-3">
                  <TotpQrCode value={enrolment.totpURI} label={t('profile.twoFactor.qrLabel')} />
                  <p className="text-center text-sm text-ink-600">
                    {t('profile.twoFactor.manualEntry')}
                    <br />
                    <code className="font-mono text-ink-900">{groupSecret(secret)}</code>
                  </p>
                </div>
                <TwoFactorCodeForm
                  id={CODE_FORM}
                  isPending={confirm.isPending}
                  onSubmit={({ code }) => confirm.mutate(code)}
                />
              </>
            )}

            {step === 'codes' && enrolment && (
              <BackupCodes
                codes={enrolment.backupCodes}
                copied={copied}
                onCopy={() => copy(enrolment.backupCodes.join('\n'))}
              />
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          {form === null || submit === null ? (
            <Button type="button" onClick={onClose}>
              {t('profile.twoFactor.done')}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" form={form} disabled={enable.isPending || confirm.isPending}>
                {t(submit)}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
